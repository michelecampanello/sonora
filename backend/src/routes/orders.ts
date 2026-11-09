import { Router } from "express";
import { pool } from "../db.js";
import { asyncHandler } from "../asyncHandler.js";
import type { ApiError, OrderConfirmation, OrderCustomer, OrderItem } from "../types.js";

const router = Router();

const MAX_LINES = 50;
const MAX_QUANTITY = 99;
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

interface CartLine {
  productId: number;
  quantity: number;
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;

/** Controlla i dati del cliente: restituisce i dati puliti, oppure il messaggio d'errore. */
function parseCustomer(value: unknown): OrderCustomer | string {
  if (!isRecord(value)) return "Dati del cliente mancanti";
  const text = (key: string): string => {
    const field = value[key];
    return typeof field === "string" ? field.trim() : "";
  };

  const customer: OrderCustomer = {
    name: text("name"),
    email: text("email"),
    address: text("address"),
    city: text("city"),
    postal_code: text("postal_code"),
    province: text("province").toUpperCase(),
  };

  if (customer.name.length < 2 || customer.name.length > 100) return "Nome non valido";
  if (customer.email.length > 255 || !EMAIL.test(customer.email)) return "Email non valida";
  if (customer.address.length < 3 || customer.address.length > 200) return "Indirizzo non valido";
  if (customer.city.length < 2 || customer.city.length > 100) return "Città non valida";
  if (!/^\d{5}$/.test(customer.postal_code)) return "Il CAP deve avere 5 cifre";
  if (!/^[A-Z]{2}$/.test(customer.province)) return "La provincia deve avere 2 lettere";
  return customer;
}

/** Controlla le righe del carrello e unisce eventuali doppioni dello stesso prodotto. */
function parseItems(value: unknown): CartLine[] | string {
  if (!Array.isArray(value) || value.length === 0) return "Il carrello è vuoto";
  if (value.length > MAX_LINES) return "Troppi articoli nel carrello";

  const quantities = new Map<number, number>();
  for (const item of value) {
    if (!isRecord(item)) return "Articolo non valido";
    const { productId, quantity } = item;
    if (typeof productId !== "number" || !Number.isInteger(productId) || productId <= 0) {
      return "Articolo non valido";
    }
    if (typeof quantity !== "number" || !Number.isInteger(quantity) || quantity <= 0) {
      return "Quantità non valida";
    }
    quantities.set(productId, (quantities.get(productId) ?? 0) + quantity);
  }

  const lines = [...quantities].map(([productId, quantity]) => ({ productId, quantity }));
  if (lines.some((line) => line.quantity > MAX_QUANTITY)) return "Quantità non valida";
  return lines;
}

/**
 * POST /api/orders — crea un ordine come ospite e scala il magazzino.
 * Il client manda solo prodotti e quantità: prezzi e totale li decide sempre il server.
 */
router.post(
  "/",
  asyncHandler<{}, OrderConfirmation | ApiError, unknown, unknown>(async (req, res) => {
    const body: Record<string, unknown> = isRecord(req.body) ? req.body : {};
    const customer = parseCustomer(body.customer);
    if (typeof customer === "string") return res.status(400).json({ error: customer });
    const lines = parseItems(body.items);
    if (typeof lines === "string") return res.status(400).json({ error: lines });

    const client = await pool.connect();
    try {
      await client.query("BEGIN");

      // FOR UPDATE blocca le righe fino al COMMIT: due ordini simultanei non possono vendere
      // lo stesso ultimo pezzo. ORDER BY id evita i deadlock tra ordini con gli stessi prodotti.
      const { rows: products } = await client.query<{
        id: number;
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
          unavailable.push(`articolo ${line.productId}`);
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

      if (unavailable.length > 0) {
        await client.query("ROLLBACK");
        return res.status(409).json({
          error: `Disponibilità insufficiente per: ${unavailable.join(", ")}`,
        });
      }

      const total = (totalCents / 100).toFixed(2);
      const orderResult = await client.query<{ id: number }>(
        `INSERT INTO orders (total, customer_name, customer_email, address, city, postal_code, province)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         RETURNING id`,
        [
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
      return res.status(201).json({ id, total, customer, items });
    } catch (err) {
      await client.query("ROLLBACK");
      throw err;
    } finally {
      client.release();
    }
  }),
);

export default router;
