import { asyncHandler } from "../asyncHandler.js";
import {
  allowedNextStatuses,
  changeOrderStatus,
  getStats,
  InvalidStatusChangeError,
  listAllOrders,
} from "../services/adminOrders.service.js";
import { listAdminProducts, updateProduct, type ProductChanges } from "../services/adminProducts.service.js";
import { findAnyOrder } from "../services/orders.service.js";
import { isUuid } from "../uuid.js";
import { asRecord, text } from "../validation.js";
import {
  ORDER_STATUSES,
  type AdminOrderSummary,
  type AdminProduct,
  type AdminStats,
  type ApiError,
  type OrderDetail,
  type OrderStatus,
  type Paginated,
} from "../types.js";

const MAX_STOCK = 100_000;
// Fino a 8 cifre prima della virgola e 2 dopo, come NUMERIC(10, 2) nel database
const PRICE = /^\d{1,8}(\.\d{1,2})?$/;

const isOrderStatus = (value: unknown): value is OrderStatus =>
  typeof value === "string" && (ORDER_STATUSES as readonly string[]).includes(value);

const pageFrom = (value: unknown): number => {
  const page = Number(value);
  return Number.isSafeInteger(page) && page > 0 ? page : 1;
};

/** GET /api/admin/stats — i numeri della pagina iniziale */
export const getAdminStats = asyncHandler<{}, AdminStats, unknown, unknown>(async (_req, res) => {
  res.json(await getStats());
});

/** GET /api/admin/orders?status=pending&page=1 */
export const getAdminOrders = asyncHandler<{}, Paginated<AdminOrderSummary>, unknown, { status?: unknown; page?: unknown }>(
  async (req, res) => {
    const status = isOrderStatus(req.query.status) ? req.query.status : undefined;
    res.json(await listAllOrders(status, pageFrom(req.query.page)));
  },
);

/** GET /api/admin/orders/:id — dettaglio, con gli stati in cui l'ordine può passare */
export const getAdminOrder = asyncHandler<
  { id: string },
  (OrderDetail & { next_statuses: readonly OrderStatus[] }) | ApiError,
  unknown,
  unknown
>(async (req, res) => {
  const order = isUuid(req.params.id) ? await findAnyOrder(req.params.id) : null;
  if (!order) return res.status(404).json({ error: "Ordine non trovato" });
  return res.json({ ...order, next_statuses: allowedNextStatuses(order.status) });
});

/** PATCH /api/admin/orders/:id/status — body: { status }. Risponde con l'ordine aggiornato e i nuovi stati possibili. */
export const patchOrderStatus = asyncHandler<
  { id: string },
  (AdminOrderSummary & { next_statuses: readonly OrderStatus[] }) | ApiError,
  unknown,
  unknown
>(
  async (req, res) => {
    const { status } = asRecord(req.body);
    if (!isOrderStatus(status)) return res.status(400).json({ error: "Stato non valido" });
    if (!isUuid(req.params.id)) return res.status(404).json({ error: "Ordine non trovato" });

    try {
      const order = await changeOrderStatus(req.params.id, status);
      if (!order) return res.status(404).json({ error: "Ordine non trovato" });
      return res.json({ ...order, next_statuses: allowedNextStatuses(order.status) });
    } catch (err) {
      if (err instanceof InvalidStatusChangeError) return res.status(409).json({ error: err.message });
      throw err;
    }
  },
);

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

/** Legge solo i campi modificabili presenti nel body: le modifiche, oppure il messaggio d'errore */
function parseProductChanges(value: unknown): ProductChanges | string {
  const source = asRecord(value);
  const changes: ProductChanges = {};

  if (source.price !== undefined) {
    const price = typeof source.price === "number" ? String(source.price) : source.price;
    if (typeof price !== "string" || !PRICE.test(price)) return "Prezzo non valido";
    changes.price = Number(price).toFixed(2);
  }
  if (source.stock !== undefined) {
    const { stock } = source;
    if (typeof stock !== "number" || !Number.isInteger(stock) || stock < 0 || stock > MAX_STOCK) {
      return "Quantità in magazzino non valida";
    }
    changes.stock = stock;
  }
  for (const flag of ["active", "featured"] as const) {
    if (source[flag] === undefined) continue;
    if (typeof source[flag] !== "boolean") return `Valore non valido per ${flag}`;
    changes[flag] = source[flag];
  }

  return Object.keys(changes).length > 0 ? changes : "Nessuna modifica indicata";
}

/** PATCH /api/admin/products/:id — body: uno o più tra price, stock, active, featured */
export const patchProduct = asyncHandler<{ id: string }, AdminProduct | ApiError, unknown, unknown>(async (req, res) => {
  const changes = parseProductChanges(req.body);
  if (typeof changes === "string") return res.status(400).json({ error: changes });
  if (!isUuid(req.params.id)) return res.status(404).json({ error: "Prodotto non trovato" });

  const product = await updateProduct(req.params.id, changes);
  if (!product) return res.status(404).json({ error: "Prodotto non trovato" });
  return res.json(product);
});
