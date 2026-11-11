import { asyncHandler } from "../asyncHandler.js";
import {
  allowedNextStatuses,
  changeOrderStatus,
  getStats,
  InvalidStatusChangeError,
  listAllOrders,
} from "../services/adminOrders.service.js";
import { findAnyOrder } from "../services/orders.service.js";
import { isUuid } from "../uuid.js";
import { asRecord, pageFrom } from "../validation.js";
import {
  ORDER_STATUSES,
  type AdminOrderSummary,
  type AdminStats,
  type ApiError,
  type OrderDetail,
  type OrderStatus,
  type Paginated,
} from "../types.js";

const isOrderStatus = (value: unknown): value is OrderStatus =>
  typeof value === "string" && (ORDER_STATUSES as readonly string[]).includes(value);

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
