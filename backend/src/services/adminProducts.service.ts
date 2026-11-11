import { pool } from "../db.js";
import type { AdminProduct, Paginated } from "../types.js";
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
