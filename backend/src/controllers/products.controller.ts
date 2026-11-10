import { asyncHandler } from "../asyncHandler.js";
import { isSlug, parseSlugList } from "../slug.js";
import { parseUuidList } from "../uuid.js";
import {
  findProductBySlug,
  isProductSort,
  listProducts,
  type ProductSort,
} from "../services/products.service.js";
import type { ApiError, Paginated, ProductDetail, ProductSummary } from "../types.js";

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
export const getProducts = asyncHandler<{}, Paginated<ProductSummary>, unknown, ProductQuery>(
  async (req, res) => {
    const brand = asString(req.query.brand);
    const ids = asString(req.query.ids);
    const sortParam = asString(req.query.sort) ?? "newest";
    const sort: ProductSort = isProductSort(sortParam) ? sortParam : "newest";

    const result = await listProducts({
      q: asString(req.query.q),
      category: asString(req.query.category),
      brands: brand ? parseSlugList(brand) : [],
      minPrice: asNumber(req.query.minPrice),
      maxPrice: asNumber(req.query.maxPrice),
      inStock: asString(req.query.inStock) === "true",
      featured: asString(req.query.featured) === "true",
      ids: ids ? parseUuidList(ids) : undefined,
      sort,
      page: Math.max(1, Math.trunc(asNumber(req.query.page) ?? 1)),
      limit: Math.min(50, Math.max(1, Math.trunc(asNumber(req.query.limit) ?? 12))),
    });

    res.json(result);
  },
);

/** GET /api/products/:slug — dettaglio prodotto con caratteristiche tecniche e immagini */
export const getProduct = asyncHandler<{ slug: string }, ProductDetail | ApiError, unknown, unknown>(
  async (req, res) => {
    const { slug } = req.params;
    // Uno slug malformato non può esistere: per chi visita l'URL è una pagina inesistente
    if (!isSlug(slug)) {
      return res.status(404).json({ error: "Prodotto non trovato" });
    }

    const product = await findProductBySlug(slug);
    if (!product) {
      return res.status(404).json({ error: "Prodotto non trovato" });
    }

    return res.json(product);
  },
);
