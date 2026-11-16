import { pool } from "../db.js";
import { cancelAndRestock } from "./orders.service.js";
import { refundPayment } from "./stripe.service.js";
import type { AdminOrderSummary, AdminStats, OrderStatus, Paginated } from "../types.js";

const ORDERS_PER_PAGE = 20;
export const LOW_STOCK_THRESHOLD = 5;

/**
 * Gli stati in cui un ordine può passare: in lavorazione → spedito → consegnato.
 * Si può annullare finché non è consegnato: dopo la spedizione vuol dire che il cliente ha rifiutato il pacco.
 * Un ordine in attesa del pagamento con carta lo cambia solo Stripe: si paga, o la pagina scade e si annulla.
 * Consegnato e annullato sono definitivi.
 */
const NEXT_STATUSES: Record<OrderStatus, readonly OrderStatus[]> = {
  awaiting_payment: [],
  pending: ["shipped", "cancelled"],
  shipped: ["delivered", "cancelled"],
  delivered: [],
  cancelled: [],
};

export const allowedNextStatuses = (status: OrderStatus): readonly OrderStatus[] => NEXT_STATUSES[status];

export class InvalidStatusChangeError extends Error {
  constructor(from: OrderStatus, to: OrderStatus) {
    super(`Un ordine "${from}" non può passare a "${to}"`);
  }
}

const SUMMARY_COLUMNS = `
  o.id, o.status, o.total, o.created_at, o.customer_name, o.customer_email, o.user_id,
  (SELECT COALESCE(SUM(i.quantity), 0)::int FROM order_items i WHERE i.order_id = o.id) AS item_count`;

/** Tutti gli ordini, dal più recente, eventualmente solo quelli in uno stato */
export async function listAllOrders(status: OrderStatus | undefined, page: number): Promise<Paginated<AdminOrderSummary>> {
  const where = status ? "WHERE o.status = $1" : "";
  const params: unknown[] = status ? [status] : [];

  const countResult = await pool.query<{ total: number }>(`SELECT COUNT(*)::int AS total FROM orders o ${where}`, params);
  const total = countResult.rows[0]?.total ?? 0;

  const { rows } = await pool.query<AdminOrderSummary>(
    `SELECT ${SUMMARY_COLUMNS}
     FROM orders o ${where}
     ORDER BY o.created_at DESC, o.id
     LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
    [...params, ORDERS_PER_PAGE, (page - 1) * ORDERS_PER_PAGE],
  );

  return { items: rows, total, page, pages: Math.ceil(total / ORDERS_PER_PAGE) };
}

/**
 * Cambia lo stato di un ordine. Alla consegna il contrassegno risulta pagato.
 * Se viene annullato, i pezzi tornano in magazzino e un pagamento con carta viene rimborsato su Stripe.
 * Restituisce null se l'ordine non esiste; lancia InvalidStatusChangeError se il passaggio non è ammesso.
 */
export async function changeOrderStatus(orderId: string, next: OrderStatus): Promise<AdminOrderSummary | null> {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    // FOR UPDATE: due admin che annullano lo stesso ordine insieme non possono rimettere in magazzino due volte
    const { rows } = await client.query<{
      status: OrderStatus;
      paid_at: Date | null;
      stripe_payment_intent_id: string | null;
    }>("SELECT status, paid_at, stripe_payment_intent_id FROM orders WHERE id = $1 FOR UPDATE", [orderId]);
    const current = rows[0];
    if (!current) {
      await client.query("ROLLBACK");
      return null;
    }
    if (!NEXT_STATUSES[current.status].includes(next)) throw new InvalidStatusChangeError(current.status, next);

    if (next === "cancelled") {
      await cancelAndRestock(client, orderId);
      // Prima del COMMIT: se Stripe non rimborsa, l'ordine resta com'era e l'admin può riprovare.
      // Riprovando, Stripe riconosce la richiesta e non rimborsa due volte.
      if (current.paid_at && current.stripe_payment_intent_id) {
        await refundPayment(current.stripe_payment_intent_id, orderId);
      }
    } else {
      // Consegnato: per il contrassegno è anche il momento in cui arrivano i soldi
      await client.query(
        `UPDATE orders SET status = $2::varchar, paid_at = CASE WHEN $2::varchar = 'delivered' THEN COALESCE(paid_at, now()) ELSE paid_at END
         WHERE id = $1`,
        [orderId, next],
      );
    }

    const updated = await client.query<AdminOrderSummary>(`SELECT ${SUMMARY_COLUMNS} FROM orders o WHERE o.id = $1`, [orderId]);
    await client.query("COMMIT");
    return updated.rows[0]!;
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
}

/** I numeri della pagina iniziale del pannello */
export async function getStats(): Promise<AdminStats> {
  const [byStatus, products] = await Promise.all([
    pool.query<{ status: OrderStatus; count: number; total: string }>(
      `SELECT status, COUNT(*)::int AS count,
         COALESCE(SUM(total) FILTER (WHERE paid_at IS NOT NULL), 0)::text AS total
       FROM orders GROUP BY status`,
    ),
    pool.query<{ active: number; low_stock: number }>(
      `SELECT COUNT(*) FILTER (WHERE active)::int AS active,
              COUNT(*) FILTER (WHERE active AND stock <= $1)::int AS low_stock
       FROM products`,
      [LOW_STOCK_THRESHOLD],
    ),
  ]);

  const orders: Record<OrderStatus, number> = { awaiting_payment: 0, pending: 0, shipped: 0, delivered: 0, cancelled: 0 };
  let revenueCents = 0;
  for (const row of byStatus.rows) {
    orders[row.status] = row.count;
    // Gli ordini annullati dopo il pagamento sono stati rimborsati: non contano
    if (row.status !== "cancelled") revenueCents += Math.round(Number(row.total) * 100);
  }

  return {
    orders,
    revenue: (revenueCents / 100).toFixed(2),
    activeProducts: products.rows[0]!.active,
    lowStockProducts: products.rows[0]!.low_stock,
  };
}
