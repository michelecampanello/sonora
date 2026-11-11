import { pool } from "../db.js";
import type { AdminOrderSummary, AdminStats, OrderStatus, Paginated } from "../types.js";

const ORDERS_PER_PAGE = 20;
export const LOW_STOCK_THRESHOLD = 5;

/**
 * Gli stati in cui un ordine può passare. Il pagamento avviene alla consegna, quindi:
 * in lavorazione → spedito → pagato (consegnato). Si può annullare finché non è pagato:
 * dopo la spedizione vuol dire che il cliente ha rifiutato il pacco.
 * Pagato e annullato sono definitivi.
 */
const NEXT_STATUSES: Record<OrderStatus, readonly OrderStatus[]> = {
  pending: ["shipped", "cancelled"],
  shipped: ["paid", "cancelled"],
  paid: [],
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
 * Cambia lo stato di un ordine. Se viene annullato, i pezzi tornano in magazzino.
 * Restituisce null se l'ordine non esiste; lancia InvalidStatusChangeError se il passaggio non è ammesso.
 */
export async function changeOrderStatus(orderId: string, next: OrderStatus): Promise<AdminOrderSummary | null> {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    // FOR UPDATE: due admin che annullano lo stesso ordine insieme non possono rimettere in magazzino due volte
    const { rows } = await client.query<{ status: OrderStatus }>("SELECT status FROM orders WHERE id = $1 FOR UPDATE", [
      orderId,
    ]);
    const current = rows[0]?.status;
    if (!current) {
      await client.query("ROLLBACK");
      return null;
    }
    if (!NEXT_STATUSES[current].includes(next)) throw new InvalidStatusChangeError(current, next);

    await client.query("UPDATE orders SET status = $2 WHERE id = $1", [orderId, next]);
    if (next === "cancelled") {
      await client.query(
        `UPDATE products p SET stock = p.stock + i.quantity
         FROM order_items i
         WHERE i.order_id = $1 AND i.product_id = p.id`,
        [orderId],
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
      "SELECT status, COUNT(*)::int AS count, COALESCE(SUM(total), 0)::text AS total FROM orders GROUP BY status",
    ),
    pool.query<{ active: number; low_stock: number }>(
      `SELECT COUNT(*) FILTER (WHERE active)::int AS active,
              COUNT(*) FILTER (WHERE active AND stock <= $1)::int AS low_stock
       FROM products`,
      [LOW_STOCK_THRESHOLD],
    ),
  ]);

  const orders: Record<OrderStatus, number> = { pending: 0, shipped: 0, paid: 0, cancelled: 0 };
  for (const row of byStatus.rows) orders[row.status] = row.count;

  return {
    orders,
    revenue: Number(byStatus.rows.find((row) => row.status === "paid")?.total ?? 0).toFixed(2),
    activeProducts: products.rows[0]!.active,
    lowStockProducts: products.rows[0]!.low_stock,
  };
}
