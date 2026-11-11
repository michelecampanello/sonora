import { pool } from "../db.js";
import type {
  Paginated,
  ProductDetail,
  ProductPhoto,
  ProductSpec,
  ProductSummary,
} from "../types.js";

// Ordinamenti ammessi: mai inserire nella query un valore preso direttamente dall'utente.
const SORTS = {
  newest: "p.created_at DESC",
  price_asc: "p.price ASC",
  price_desc: "p.price DESC",
  name: "p.name ASC",
} as const;
export type ProductSort = keyof typeof SORTS;

// Object.hasOwn e non `in`: valori come "toString" sono proprietà ereditate, non ordinamenti ammessi.
export const isProductSort = (value: string): value is ProductSort => Object.hasOwn(SORTS, value);

export interface ProductFilters {
  q?: string | undefined;
  category?: string | undefined;
  brands: string[];
  minPrice?: number | undefined;
  maxPrice?: number | undefined;
  inStock: boolean;
  featured: boolean;
  /** Se presente limita il risultato a questi prodotti, anche quando la lista è vuota */
  ids?: string[] | undefined;
  sort: ProductSort;
  page: number;
  limit: number;
}

const PRODUCT_COLUMNS = `
  p.id, p.slug, p.name, p.price, p.stock,
  (SELECT i.url FROM product_images i
   WHERE i.product_id = p.id
   ORDER BY i.sort_order, i.id LIMIT 1) AS image_url,
  c.name AS category, c.slug AS category_slug,
  b.id AS brand_id, b.slug AS brand_slug, b.name AS brand`;

const PRODUCT_JOINS = `
  FROM products p
  JOIN categories c ON p.category_id = c.id
  JOIN brands b ON p.brand_id = b.id`;

/** Catalogo filtrato, ordinato e paginato */
export async function listProducts(filters: ProductFilters): Promise<Paginated<ProductSummary>> {
  const { q, category, brands, minPrice, maxPrice, inStock, featured, ids, sort, page, limit } = filters;

  const conditions: string[] = ["p.active"]; // i prodotti nascosti non compaiono mai nel negozio
  const params: unknown[] = [];
  // Aggiunge un parametro e restituisce il segnaposto ($1, $2, ...): protegge dalla SQL injection.
  const add = (value: unknown): string => {
    params.push(value);
    return `$${params.length}`;
  };

  if (q) {
    const term = add(`%${q}%`);
    const words = add(q);
    // ILIKE trova il testo esatto; <% (pg_trgm) trova anche le parole scritte in modo simile
    conditions.push(
      `(p.name ILIKE ${term} OR p.description ILIKE ${term} OR p.sku ILIKE ${term}
        OR ${words} <% p.name OR ${words} <% p.description)`,
    );
  }
  if (category) {
    // La categoria scelta oppure le sue sottocategorie
    const slug = add(category);
    conditions.push(`c.id IN (
      SELECT id FROM categories WHERE slug = ${slug}
      UNION
      SELECT sub.id FROM categories sub
      JOIN categories parent ON sub.parent_id = parent.id
      WHERE parent.slug = ${slug}
    )`);
  }
  if (brands.length > 0) conditions.push(`b.slug = ANY(${add(brands)})`);
  if (minPrice !== undefined) conditions.push(`p.price >= ${add(minPrice)}`);
  if (maxPrice !== undefined) conditions.push(`p.price <= ${add(maxPrice)}`);
  if (inStock) conditions.push("p.stock > 0");
  if (featured) conditions.push("p.featured");
  if (ids) {
    // Senza controllo sulla lunghezza: se nessun id è valido non si restituisce nulla, non tutto il catalogo
    conditions.push(`p.id = ANY(${add(ids)})`);
  }

  const where = `WHERE ${conditions.join(" AND ")}`;

  const countResult = await pool.query<{ total: number }>(
    `SELECT COUNT(*)::int AS total ${PRODUCT_JOINS} ${where}`,
    params,
  );
  const total = countResult.rows[0]?.total ?? 0;

  const itemsResult = await pool.query<ProductSummary>(
    `SELECT ${PRODUCT_COLUMNS}
     ${PRODUCT_JOINS}
     ${where}
     ORDER BY ${SORTS[sort]}, p.id
     LIMIT ${add(limit)} OFFSET ${add((page - 1) * limit)}`,
    params,
  );

  return {
    items: itemsResult.rows,
    total,
    page,
    pages: Math.ceil(total / limit),
  };
}

/** Prodotto con caratteristiche tecniche e immagini, oppure null se non esiste o è nascosto */
export async function findProductBySlug(slug: string): Promise<ProductDetail | null> {
  const productResult = await pool.query<Omit<ProductDetail, "specs" | "images">>(
    `SELECT ${PRODUCT_COLUMNS}, p.sku, p.description, p.created_at
     ${PRODUCT_JOINS}
     WHERE p.slug = $1 AND p.active`,
    [slug],
  );
  const product = productResult.rows[0];
  if (!product) return null;

  const [specsResult, imagesResult] = await Promise.all([
    pool.query<ProductSpec>(
      "SELECT label, value FROM product_specs WHERE product_id = $1 ORDER BY sort_order",
      [product.id],
    ),
    pool.query<ProductPhoto>(
      "SELECT id, url, alt FROM product_images WHERE product_id = $1 ORDER BY sort_order, id",
      [product.id],
    ),
  ]);

  return { ...product, specs: specsResult.rows, images: imagesResult.rows };
}

/** Prodotti in vendita di una marca, in ordine di nome */
export async function listProductsByBrand(brandId: string): Promise<ProductSummary[]> {
  const { rows } = await pool.query<ProductSummary>(
    `SELECT ${PRODUCT_COLUMNS}
     ${PRODUCT_JOINS}
     WHERE p.brand_id = $1 AND p.active
     ORDER BY p.name`,
    [brandId],
  );
  return rows;
}
