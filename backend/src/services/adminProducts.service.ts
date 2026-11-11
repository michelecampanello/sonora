import pg, { type PoolClient } from "pg";
import { pool } from "../db.js";
import type { AdminProduct, AdminProductDetail, Paginated, ProductInput, ProductSpec } from "../types.js";
import { LOW_STOCK_THRESHOLD } from "./adminOrders.service.js";

const PRODUCTS_PER_PAGE = 25;

export interface AdminProductFilters {
  q?: string | undefined;
  /** Solo i prodotti in vendita con pochi pezzi rimasti */
  lowStock: boolean;
  page: number;
}

/** I campi che il pannello può modificare. I nomi delle colonne sono scritti qui, mai presi dalla richiesta. */
export interface ProductChanges {
  price?: string;
  stock?: number;
  active?: boolean;
  featured?: boolean;
}

const COLUMNS = `p.id, p.sku, p.slug, p.name, p.price, p.stock, p.active, p.featured, b.name AS brand, c.name AS category`;
const JOINS = `FROM products p JOIN brands b ON b.id = p.brand_id JOIN categories c ON c.id = p.category_id`;

/** Tutti i prodotti, anche quelli nascosti dal negozio, in ordine di nome */
export async function listAdminProducts({ q, lowStock, page }: AdminProductFilters): Promise<Paginated<AdminProduct>> {
  const conditions: string[] = [];
  const params: unknown[] = [];
  const add = (value: unknown): string => {
    params.push(value);
    return `$${params.length}`;
  };

  if (q) {
    const term = add(`%${q}%`);
    conditions.push(`(p.name ILIKE ${term} OR p.sku ILIKE ${term})`);
  }
  if (lowStock) conditions.push(`p.active AND p.stock <= ${add(LOW_STOCK_THRESHOLD)}`);
  const where = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

  const countResult = await pool.query<{ total: number }>(`SELECT COUNT(*)::int AS total ${JOINS} ${where}`, params);
  const total = countResult.rows[0]?.total ?? 0;

  const limit = add(PRODUCTS_PER_PAGE);
  const offset = add((page - 1) * PRODUCTS_PER_PAGE);
  const { rows } = await pool.query<AdminProduct>(
    `SELECT ${COLUMNS} ${JOINS} ${where} ORDER BY p.name, p.id LIMIT ${limit} OFFSET ${offset}`,
    params,
  );

  return { items: rows, total, page, pages: Math.ceil(total / PRODUCTS_PER_PAGE) };
}

/** Aggiorna solo i campi indicati. Restituisce null se il prodotto non esiste. */
export async function updateProduct(id: string, changes: ProductChanges): Promise<AdminProduct | null> {
  const assignments: string[] = [];
  const params: unknown[] = [id];
  for (const column of ["price", "stock", "active", "featured"] as const) {
    if (changes[column] === undefined) continue;
    params.push(changes[column]);
    assignments.push(`${column} = $${params.length}`);
  }

  if (assignments.length === 0) throw new Error("updateProduct senza modifiche");

  // La CTE aggiorna la riga e la restituisce già unita a marca e categoria, in una sola query
  const { rows } = await pool.query<AdminProduct>(
    `WITH p AS (UPDATE products SET ${assignments.join(", ")} WHERE id = $1 RETURNING *)
     SELECT ${COLUMNS} FROM p JOIN brands b ON b.id = p.brand_id JOIN categories c ON c.id = p.category_id`,
    params,
  );
  return rows[0] ?? null;
}

const FOREIGN_KEY_VIOLATION = "23503";
const UNIQUE_VIOLATION = "23505";

export class SkuTakenError extends Error {}
export class MissingReferenceError extends Error {}

/** Il prodotto completo, anche se nascosto. Null se non esiste. */
export async function findAdminProduct(id: string): Promise<AdminProductDetail | null> {
  const { rows } = await pool.query<Omit<AdminProductDetail, "specs" | "images">>(
    `SELECT ${COLUMNS}, p.description, p.category_id, p.brand_id ${JOINS} WHERE p.id = $1`,
    [id],
  );
  const product = rows[0];
  if (!product) return null;

  const [specs, images] = await Promise.all([
    pool.query<ProductSpec>("SELECT label, value FROM product_specs WHERE product_id = $1 ORDER BY sort_order", [id]),
    pool.query<AdminProductDetail["images"][number]>(
      "SELECT url, alt FROM product_images WHERE product_id = $1 ORDER BY sort_order, id",
      [id],
    ),
  ]);
  return { ...product, specs: specs.rows, images: images.rows };
}

/** Sostituisce caratteristiche e immagini con quelle indicate, nell'ordine dato */
async function replaceDetails(client: PoolClient, productId: string, input: ProductInput) {
  await client.query("DELETE FROM product_specs WHERE product_id = $1", [productId]);
  await client.query("DELETE FROM product_images WHERE product_id = $1", [productId]);
  // Una riga alla volta: sort_order delle caratteristiche è un SERIAL, quindi conta l'ordine di inserimento
  for (const spec of input.specs) {
    await client.query("INSERT INTO product_specs (product_id, label, value) VALUES ($1, $2, $3)", [
      productId,
      spec.label,
      spec.value,
    ]);
  }
  for (const [index, image] of input.images.entries()) {
    await client.query("INSERT INTO product_images (product_id, url, alt, sort_order) VALUES ($1, $2, $3, $4)", [
      productId,
      image.url,
      image.alt,
      index,
    ]);
  }
}

/** Esegue fn in una transazione, traducendo gli errori del database in errori comprensibili */
async function inTransaction<T>(fn: (client: PoolClient) => Promise<T>): Promise<T> {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const result = await fn(client);
    await client.query("COMMIT");
    return result;
  } catch (err) {
    await client.query("ROLLBACK");
    if (err instanceof pg.DatabaseError && err.code === UNIQUE_VIOLATION && err.constraint === "products_sku_key") {
      throw new SkuTakenError();
    }
    if (err instanceof pg.DatabaseError && err.code === FOREIGN_KEY_VIOLATION) throw new MissingReferenceError();
    throw err;
  } finally {
    client.release();
  }
}

const PRODUCT_FIELDS = [
  "sku",
  "name",
  "description",
  "price",
  "stock",
  "active",
  "featured",
  "category_id",
  "brand_id",
] as const satisfies readonly (keyof ProductInput)[];

/**
 * Crea un prodotto con caratteristiche e immagini. Lo slug lo genera il database dal nome.
 * Lancia SkuTakenError se il codice articolo esiste già, MissingReferenceError se categoria o marca non esistono.
 */
export async function createProduct(input: ProductInput): Promise<AdminProductDetail> {
  const id = await inTransaction(async (client) => {
    const placeholders = PRODUCT_FIELDS.map((_, i) => `$${i + 1}`).join(", ");
    const { rows } = await client.query<{ id: string }>(
      `INSERT INTO products (${PRODUCT_FIELDS.join(", ")}) VALUES (${placeholders}) RETURNING id`,
      PRODUCT_FIELDS.map((field) => input[field]),
    );
    const productId = rows[0]!.id;
    await replaceDetails(client, productId, input);
    return productId;
  });
  return (await findAdminProduct(id))!;
}

/**
 * Sostituisce tutti i dati di un prodotto. Lo slug non cambia, anche se cambia il nome:
 * i link già condivisi e i carrelli salvati continuano a funzionare.
 * Restituisce null se il prodotto non esiste; lancia gli stessi errori di createProduct.
 */
export async function replaceProduct(id: string, input: ProductInput): Promise<AdminProductDetail | null> {
  const found = await inTransaction(async (client) => {
    const assignments = PRODUCT_FIELDS.map((field, i) => `${field} = $${i + 2}`).join(", ");
    const { rowCount } = await client.query(`UPDATE products SET ${assignments} WHERE id = $1`, [
      id,
      ...PRODUCT_FIELDS.map((field) => input[field]),
    ]);
    if (!rowCount) return false;
    await replaceDetails(client, id, input);
    return true;
  });
  return found ? findAdminProduct(id) : null;
}
