import { Router } from "express";
import { pool } from "../db.js";
import { asyncHandler } from "../asyncHandler.js";
import { isSlug, parseSlugList } from "../slug.js";
import { parseUuidList } from "../uuid.js";
import type {
  ApiError,
  Paginated,
  ProductDetail,
  ProductPhoto,
  ProductSpec,
  ProductSummary,
} from "../types.js";

const router = Router();

// Ordinamenti ammessi: mai inserire nella query un valore preso direttamente dall'utente.
const SORTS = {
  newest: "p.created_at DESC",
  price_asc: "p.price ASC",
  price_desc: "p.price DESC",
  name: "p.name ASC",
} as const;
type SortKey = keyof typeof SORTS;

const isSortKey = (value: string): value is SortKey => value in SORTS;

/** Parametri accettati nella query string del catalogo */
interface ProductQuery {
  q?: unknown;
  category?: unknown;
  brand?: unknown;
  minPrice?: unknown;
  maxPrice?: unknown;
  inStock?: unknown;
  featured?: unknown;
  ids?: unknown;
  sort?: unknown;
  page?: unknown;
  limit?: unknown;
}

// La query string può contenere stringhe, array o oggetti (es. ?q=a&q=b):
// accettiamo solo stringhe semplici e scartiamo il resto.
const asString = (value: unknown): string | undefined =>
  typeof value === "string" && value.trim() !== "" ? value.trim() : undefined;

const asNumber = (value: unknown): number | undefined => {
  const s = asString(value);
  if (s === undefined) return undefined;
  const n = Number(s);
  return Number.isFinite(n) ? n : undefined;
};

export const PRODUCT_COLUMNS = `
  p.id, p.slug, p.name, p.price, p.stock,
  (SELECT i.url FROM product_images i
   WHERE i.product_id = p.id
   ORDER BY i.sort_order, i.id LIMIT 1) AS image_url,
  c.name AS category, c.slug AS category_slug,
  b.id AS brand_id, b.slug AS brand_slug, b.name AS brand`;

export const PRODUCT_JOINS = `
  FROM products p
  JOIN categories c ON p.category_id = c.id
  JOIN brands b ON p.brand_id = b.id`;

/**
 * GET /api/products
 * Filtri opzionali (query string):
 *   q         testo da cercare in nome, descrizione o codice articolo (tollera gli errori di battitura)
 *   category  slug della categoria (include le sottocategorie)
 *   brand     uno o più slug di marca, separati da virgola
 *   minPrice, maxPrice
 *   inStock   "true" per mostrare solo i disponibili
 *   featured  "true" per mostrare solo i prodotti in evidenza
 *   ids       uno o più UUID di prodotto, separati da virgola (usato dal carrello)
 *   sort      newest | price_asc | price_desc | name
 *   page, limit
 */
router.get(
  "/",
  asyncHandler<{}, Paginated<ProductSummary>, unknown, ProductQuery>(
    async (req, res) => {
      const q = asString(req.query.q);
      const category = asString(req.query.category);
      const brand = asString(req.query.brand);
      const minPrice = asNumber(req.query.minPrice);
      const maxPrice = asNumber(req.query.maxPrice);
      const inStock = asString(req.query.inStock) === "true";
      const featured = asString(req.query.featured) === "true";
      const productIds = asString(req.query.ids);
      const sortParam = asString(req.query.sort) ?? "newest";
      const sort: SortKey = isSortKey(sortParam) ? sortParam : "newest";
      const page = Math.max(1, Math.trunc(asNumber(req.query.page) ?? 1));
      const limit = Math.min(
        50,
        Math.max(1, Math.trunc(asNumber(req.query.limit) ?? 12)),
      );

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
      if (brand) {
        const slugs = parseSlugList(brand);
        if (slugs.length > 0) conditions.push(`b.slug = ANY(${add(slugs)})`);
      }
      if (minPrice !== undefined)
        conditions.push(`p.price >= ${add(minPrice)}`);
      if (maxPrice !== undefined)
        conditions.push(`p.price <= ${add(maxPrice)}`);
      if (inStock) conditions.push("p.stock > 0");
      if (featured) conditions.push("p.featured");
      if (productIds) {
        // Senza controllo sulla lunghezza: se nessun id è valido non si restituisce nulla, non tutto il catalogo
        conditions.push(`p.id = ANY(${add(parseUuidList(productIds))})`);
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

      res.json({
        items: itemsResult.rows,
        total,
        page,
        pages: Math.ceil(total / limit),
      });
    },
  ),
);

/** GET /api/products/:slug — dettaglio prodotto con caratteristiche tecniche e immagini */
router.get(
  "/:slug",
  asyncHandler<{ slug: string }, ProductDetail | ApiError, unknown, unknown>(
    async (req, res) => {
      const { slug } = req.params;
      // Uno slug malformato non può esistere: per chi visita l'URL è una pagina inesistente
      if (!isSlug(slug)) {
        return res.status(404).json({ error: "Prodotto non trovato" });
      }

      const productResult = await pool.query<Omit<ProductDetail, "specs" | "images">>(
        `SELECT ${PRODUCT_COLUMNS}, p.sku, p.description, p.created_at
       ${PRODUCT_JOINS}
       WHERE p.slug = $1 AND p.active`,
        [slug],
      );
      const product = productResult.rows[0];
      if (!product) {
        return res.status(404).json({ error: "Prodotto non trovato" });
      }

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

      return res.json({ ...product, specs: specsResult.rows, images: imagesResult.rows });
    },
  ),
);

export default router;
