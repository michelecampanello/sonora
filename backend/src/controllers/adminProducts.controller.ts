import { asyncHandler } from "../asyncHandler.js";
import {
  createProduct,
  findAdminProduct,
  listAdminProducts,
  MissingReferenceError,
  replaceProduct,
  SkuTakenError,
  updateProduct,
  type ProductChanges,
} from "../services/adminProducts.service.js";
import { isUuid } from "../uuid.js";
import { asRecord, pageFrom, text } from "../validation.js";
import type { AdminProduct, AdminProductDetail, ApiError, Paginated, ProductInput } from "../types.js";

const MAX_STOCK = 100_000;
// Fino a 8 cifre prima della virgola e 2 dopo, come NUMERIC(10, 2) nel database
const PRICE = /^\d{1,8}(\.\d{1,2})?$/;
const SKU = /^[A-Z0-9][A-Z0-9-]{2,31}$/;
const MAX_DESCRIPTION = 5000;
const MAX_SPECS = 30;
const MAX_IMAGES = 10;

const NOT_FOUND = { error: "Prodotto non trovato" };

/** Dati non validi: il messaggio è quello da mostrare nel form */
class InvalidInput extends Error {}

/** I parser qui sotto restituiscono il valore pulito oppure lanciano InvalidInput */
function parsed<T>(parse: () => T): { value: T } | { error: string } {
  try {
    return { value: parse() };
  } catch (err) {
    if (err instanceof InvalidInput) return { error: err.message };
    throw err;
  }
}

function parsePrice(value: unknown): string {
  const price = typeof value === "number" ? String(value) : value;
  if (typeof price !== "string" || !PRICE.test(price)) throw new InvalidInput("Prezzo non valido");
  return Number(price).toFixed(2);
}

function parseStock(value: unknown): number {
  if (typeof value !== "number" || !Number.isInteger(value) || value < 0 || value > MAX_STOCK) {
    throw new InvalidInput("Quantità in magazzino non valida");
  }
  return value;
}

/**
 * Un URL d'immagine: un percorso dello stesso sito (es. /prodotti/basso.svg) oppure un indirizzo https.
 * Niente http, javascript: o data: — l'URL finisce nell'attributo src delle pagine del negozio.
 */
function isImageUrl(url: string): boolean {
  if (url.length > 2000) return false;
  if (url.startsWith("/")) return !url.startsWith("//");
  try {
    return new URL(url).protocol === "https:";
  } catch {
    return false;
  }
}

function parseSpecs(value: unknown): ProductInput["specs"] {
  if (value === undefined) return [];
  if (!Array.isArray(value) || value.length > MAX_SPECS) throw new InvalidInput(`Al massimo ${MAX_SPECS} caratteristiche`);
  const specs: ProductInput["specs"] = [];
  for (const item of value) {
    const spec = asRecord(item);
    const label = text(spec.label);
    const specValue = text(spec.value);
    if (!label || label.length > 100 || !specValue || specValue.length > 200) {
      throw new InvalidInput("Ogni caratteristica deve avere un nome (max 100 caratteri) e un valore (max 200)");
    }
    specs.push({ label, value: specValue });
  }
  return specs;
}

function parseImages(value: unknown): ProductInput["images"] {
  if (value === undefined) return [];
  if (!Array.isArray(value) || value.length > MAX_IMAGES) throw new InvalidInput(`Al massimo ${MAX_IMAGES} immagini`);
  const images: ProductInput["images"] = [];
  for (const item of value) {
    const image = asRecord(item);
    const url = text(image.url);
    const alt = text(image.alt);
    if (!isImageUrl(url)) throw new InvalidInput("Indirizzo dell'immagine non valido: usa un percorso che inizia con / oppure https://");
    if (alt.length > 200) throw new InvalidInput("Testo alternativo troppo lungo");
    images.push({ url, alt: alt || null });
  }
  return images;
}

/** Il prodotto completo inviato dal form; active e featured, se mancano, valgono true e false */
function parseProductInput(value: unknown): ProductInput {
  const source = asRecord(value);

  const sku = text(source.sku).toUpperCase();
  if (!SKU.test(sku)) throw new InvalidInput("Codice articolo non valido: 3-32 caratteri tra lettere, cifre e trattini");
  const name = text(source.name);
  if (name.length < 2 || name.length > 200) throw new InvalidInput("Nome non valido");
  const description = text(source.description);
  if (description.length > MAX_DESCRIPTION) throw new InvalidInput("Descrizione troppo lunga");

  const price = parsePrice(source.price);
  const stock = parseStock(source.stock);

  const active = source.active ?? true;
  const featured = source.featured ?? false;
  if (typeof active !== "boolean" || typeof featured !== "boolean") throw new InvalidInput("Valore non valido per active o featured");

  if (!isUuid(source.category_id)) throw new InvalidInput("Scegli una categoria");
  if (!isUuid(source.brand_id)) throw new InvalidInput("Scegli una marca");

  return {
    sku,
    name,
    description: description || null,
    price,
    stock,
    active,
    featured,
    category_id: source.category_id.toLowerCase(),
    brand_id: source.brand_id.toLowerCase(),
    specs: parseSpecs(source.specs),
    images: parseImages(source.images),
  };
}

/** Solo i campi modificabili presenti nel body, per le modifiche rapide dall'elenco */
function parseProductChanges(value: unknown): ProductChanges {
  const source = asRecord(value);
  const changes: ProductChanges = {};

  if (source.price !== undefined) changes.price = parsePrice(source.price);
  if (source.stock !== undefined) changes.stock = parseStock(source.stock);
  for (const flag of ["active", "featured"] as const) {
    if (source[flag] === undefined) continue;
    if (typeof source[flag] !== "boolean") throw new InvalidInput(`Valore non valido per ${flag}`);
    changes[flag] = source[flag];
  }

  if (Object.keys(changes).length === 0) throw new InvalidInput("Nessuna modifica indicata");
  return changes;
}

/** Traduce gli errori del database nelle risposte per il form */
function saveError(err: unknown): [status: number, body: ApiError] {
  if (err instanceof SkuTakenError) return [409, { error: "Esiste già un prodotto con questo codice articolo" }];
  if (err instanceof MissingReferenceError) return [400, { error: "La categoria o la marca scelta non esiste" }];
  throw err;
}

/** GET /api/admin/products?q=&lowStock=true&page=1 — anche i prodotti nascosti */
export const getAdminProducts = asyncHandler<{}, Paginated<AdminProduct>, unknown, { q?: unknown; lowStock?: unknown; page?: unknown }>(
  async (req, res) => {
    res.json(
      await listAdminProducts({
        q: text(req.query.q) || undefined,
        lowStock: req.query.lowStock === "true",
        page: pageFrom(req.query.page),
      }),
    );
  },
);

/** GET /api/admin/products/:id — il prodotto completo, per il form di modifica */
export const getAdminProduct = asyncHandler<{ id: string }, AdminProductDetail | ApiError, unknown, unknown>(async (req, res) => {
  const product = isUuid(req.params.id) ? await findAdminProduct(req.params.id) : null;
  if (!product) return res.status(404).json(NOT_FOUND);
  return res.json(product);
});

/** POST /api/admin/products — crea un prodotto */
export const postProduct = asyncHandler<{}, AdminProductDetail | ApiError, unknown, unknown>(async (req, res) => {
  const input = parsed(() => parseProductInput(req.body));
  if ("error" in input) return res.status(400).json(input);
  try {
    return res.status(201).json(await createProduct(input.value));
  } catch (err) {
    const [status, body] = saveError(err);
    return res.status(status).json(body);
  }
});

/** PUT /api/admin/products/:id — sostituisce tutti i dati del prodotto */
export const putProduct = asyncHandler<{ id: string }, AdminProductDetail | ApiError, unknown, unknown>(async (req, res) => {
  const input = parsed(() => parseProductInput(req.body));
  if ("error" in input) return res.status(400).json(input);
  if (!isUuid(req.params.id)) return res.status(404).json(NOT_FOUND);
  try {
    const product = await replaceProduct(req.params.id, input.value);
    if (!product) return res.status(404).json(NOT_FOUND);
    return res.json(product);
  } catch (err) {
    const [status, body] = saveError(err);
    return res.status(status).json(body);
  }
});

/** PATCH /api/admin/products/:id — body: uno o più tra price, stock, active, featured */
export const patchProduct = asyncHandler<{ id: string }, AdminProduct | ApiError, unknown, unknown>(async (req, res) => {
  const changes = parsed(() => parseProductChanges(req.body));
  if ("error" in changes) return res.status(400).json(changes);
  if (!isUuid(req.params.id)) return res.status(404).json(NOT_FOUND);

  const product = await updateProduct(req.params.id, changes.value);
  if (!product) return res.status(404).json(NOT_FOUND);
  return res.json(product);
});
