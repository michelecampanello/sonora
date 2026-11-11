import { randomUUID } from "node:crypto";
import bcrypt from "bcryptjs";
import request from "supertest";
import app from "../src/app.js";
import { pool } from "../src/db.js";

export const api = () => request(app);

/** Un client HTTP che conserva i cookie tra una richiesta e l'altra, come un browser */
export const newAgent = () => request.agent(app);

export const DEFAULT_PASSWORD = "password-di-prova";

export const uniqueEmail = () => `utente-${randomUUID()}@example.com`;

/**
 * Crea un utente direttamente nel database. Costo bcrypt minimo, per non rallentare i test,
 * e nessun passaggio da /register, per non consumare il suo limite di richieste.
 */
export async function createUser(password = DEFAULT_PASSWORD, role: "customer" | "admin" = "customer") {
  const email = uniqueEmail();
  const { rows } = await pool.query<{ id: string }>(
    "INSERT INTO users (name, email, password_hash, role) VALUES ($1, $2, $3, $4) RETURNING id",
    ["Utente di Prova", email, await bcrypt.hash(password, 4), role],
  );
  return { id: rows[0]!.id, email, password };
}

/** Un client HTTP che conserva i cookie, con la sessione di un nuovo utente (cliente o admin) già aperta */
export async function signedInAgent(role: "customer" | "admin" = "customer") {
  const user = await createUser(DEFAULT_PASSWORD, role);
  const agent = newAgent();
  await agent.post("/api/auth/login").send({ email: user.email, password: user.password }).expect(200);
  return { agent, user };
}

/** Un prodotto con prezzo e magazzino noti, per non dipendere dai dati del seed */
export async function createProduct({ price = "10.00", stock = 5, active = true } = {}) {
  const suffix = randomUUID().slice(0, 8);
  const { rows } = await pool.query<{ id: string; slug: string }>(
    `INSERT INTO products (sku, name, price, stock, active, category_id, brand_id)
     VALUES ($1, $2, $3, $4, $5,
       (SELECT id FROM categories ORDER BY slug LIMIT 1),
       (SELECT id FROM brands ORDER BY slug LIMIT 1))
     RETURNING id, slug`,
    [`TEST-${suffix}`, `Prodotto di prova ${suffix}`, price, stock, active],
  );
  return rows[0]!;
}

export async function stockOf(productId: string): Promise<number> {
  const { rows } = await pool.query<{ stock: number }>("SELECT stock FROM products WHERE id = $1", [productId]);
  return rows[0]!.stock;
}

export const customer = {
  name: "Mario Rossi",
  email: "mario.rossi@example.com",
  address: "Via Roma 1",
  city: "Milano",
  postal_code: "20100",
  province: "mi",
};
