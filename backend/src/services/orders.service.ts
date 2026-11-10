import { pool } from "../db.js";
import type { OrderConfirmation, OrderCustomer, OrderItem } from "../types.js";

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
