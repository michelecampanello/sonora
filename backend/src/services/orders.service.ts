import { pool } from "../db.js";
import type {
  OrderConfirmation,
  OrderCustomer,
  OrderDetail,
  OrderDetailItem,
  OrderItem,
  OrderStatus,
  OrderSummary,
  Paginated,
} from "../types.js";

const ORDERS_PER_PAGE = 10;

/** Gli ordini di un utente, dal più recente */
export async function listUserOrders(userId: string, page: number): Promise<Paginated<OrderSummary>> {
  const countResult = await pool.query<{ total: number }>(
    "SELECT COUNT(*)::int AS total FROM orders WHERE user_id = $1",
    [userId],
  );
  const total = countResult.rows[0]?.total ?? 0;

  const { rows } = await pool.query<OrderSummary>(
    `SELECT o.id, o.status, o.total, o.created_at,
       (SELECT COALESCE(SUM(i.quantity), 0)::int FROM order_items i WHERE i.order_id = o.id) AS item_count
     FROM orders o
     WHERE o.user_id = $1
     ORDER BY o.created_at DESC, o.id
     LIMIT $2 OFFSET $3`,
    [userId, ORDERS_PER_PAGE, (page - 1) * ORDERS_PER_PAGE],
  );

  return { items: rows, total, page, pages: Math.ceil(total / ORDERS_PER_PAGE) };
}

/** Un ordine dell'utente, oppure null se non esiste o appartiene a qualcun altro */
export async function findUserOrder(userId: string, orderId: string): Promise<OrderDetail | null> {
  const orderResult = await pool.query<{
    id: string;
    status: OrderStatus;
    total: string;
    created_at: Date;
    customer_name: string;
    customer_email: string;
    address: string;
    city: string;
    postal_code: string;
    province: string;
  }>(
    `SELECT id, status, total, created_at, customer_name, customer_email, address, city, postal_code, province
     FROM orders WHERE id = $1 AND user_id = $2`,
    [orderId, userId],
  );
  const order = orderResult.rows[0];
  if (!order) return null;

  const itemsResult = await pool.query<OrderDetailItem>(
    `SELECT i.product_id, p.name, CASE WHEN p.active THEN p.slug END AS slug,
       (SELECT img.url FROM product_images img
        WHERE img.product_id = p.id
        ORDER BY img.sort_order, img.id LIMIT 1) AS image_url,
       i.quantity, i.unit_price
     FROM order_items i
     JOIN products p ON p.id = i.product_id
     WHERE i.order_id = $1
     ORDER BY p.name`,
    [orderId],
  );

  return {
    id: order.id,
    status: order.status,
    total: order.total,
    created_at: order.created_at,
    customer: {
      name: order.customer_name,
      email: order.customer_email,
      address: order.address,
      city: order.city,
      postal_code: order.postal_code,
      province: order.province,
    },
    items: itemsResult.rows,
  };
}

export interface CartLine {
  productId: string;
  quantity: number;
}

/** Uno o più articoli dell'ordine non sono più acquistabili nella quantità richiesta */
export class InsufficientStockError extends Error {
  constructor(unavailable: string[]) {
    super(`Disponibilità insufficiente per: ${unavailable.join(", ")}`);
  }
}

/**
 * Crea un ordine e scala il magazzino, in un'unica transazione. userId è null per gli ospiti.
 * Lancia InsufficientStockError se qualche articolo non è disponibile.
 */
export async function createOrder(
  customer: OrderCustomer,
  lines: CartLine[],
  userId: string | null,
): Promise<OrderConfirmation> {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    // FOR UPDATE blocca le righe fino al COMMIT: due ordini simultanei non possono vendere
    // lo stesso ultimo pezzo. ORDER BY id evita i deadlock tra ordini con gli stessi prodotti.
    const { rows: products } = await client.query<{
      id: string;
      name: string;
      price: string;
      stock: number;
    }>(
      `SELECT id, name, price, stock FROM products
       WHERE id = ANY($1) AND active
       ORDER BY id
       FOR UPDATE`,
      [lines.map((line) => line.productId)],
    );

    const items: OrderItem[] = [];
    const unavailable: string[] = [];
    let totalCents = 0;
    for (const line of lines) {
      const product = products.find((p) => p.id === line.productId);
      if (!product) {
        unavailable.push("un articolo non più in vendita");
      } else if (product.stock < line.quantity) {
        unavailable.push(product.name);
      } else {
        // I calcoli in centesimi interi evitano gli errori di arrotondamento dei decimali
        totalCents += Math.round(Number(product.price) * 100) * line.quantity;
        items.push({
          product_id: product.id,
          name: product.name,
          quantity: line.quantity,
          unit_price: product.price,
        });
      }
    }

    if (unavailable.length > 0) throw new InsufficientStockError(unavailable);

    const total = (totalCents / 100).toFixed(2);
    const orderResult = await client.query<{ id: string }>(
      `INSERT INTO orders (user_id, total, customer_name, customer_email, address, city, postal_code, province)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING id`,
      [
        userId,
        total,
        customer.name,
        customer.email,
        customer.address,
        customer.city,
        customer.postal_code,
        customer.province,
      ],
    );
    const id = orderResult.rows[0]!.id;

    for (const item of items) {
      await client.query(
        "INSERT INTO order_items (order_id, product_id, quantity, unit_price) VALUES ($1, $2, $3, $4)",
        [id, item.product_id, item.quantity, item.unit_price],
      );
      await client.query("UPDATE products SET stock = stock - $1 WHERE id = $2", [
        item.quantity,
        item.product_id,
      ]);
    }

    await client.query("COMMIT");
    return { id, total, customer, items };
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
}
