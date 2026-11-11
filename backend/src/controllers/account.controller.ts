import { asyncHandler } from "../asyncHandler.js";
import { isEmail } from "../email.js";
import { changePassword, EmailTakenError, isCurrentPassword, updateProfile } from "../services/auth.service.js";
import { findUserOrder, listUserOrders } from "../services/orders.service.js";
import { isUuid } from "../uuid.js";
import { asRecord, isPersonName, passwordError, text } from "../validation.js";
import { startSession } from "./auth.controller.js";
import type { ApiError, AuthResponse, OrderDetail, OrderSummary, Paginated } from "../types.js";

const password = (value: unknown): string => (typeof value === "string" ? value : "");

/** GET /api/account/orders?page=1 — gli ordini dell'utente */
export const getOrders = asyncHandler<{}, Paginated<OrderSummary>, unknown, { page?: unknown }>(async (req, res) => {
  const requested = Number(req.query.page);
  const page = Number.isSafeInteger(requested) && requested > 0 ? requested : 1;
  res.json(await listUserOrders(req.user!.id, page));
});

/** GET /api/account/orders/:id — dettaglio di un ordine dell'utente */
export const getOrder = asyncHandler<{ id: string }, OrderDetail | ApiError, unknown, unknown>(async (req, res) => {
  const order = isUuid(req.params.id) ? await findUserOrder(req.user!.id, req.params.id) : null;
  // Lo stesso 404 per un ordine inesistente e per uno altrui: non rivela quali ordini esistono
  if (!order) return res.status(404).json({ error: "Ordine non trovato" });
  return res.json(order);
});

/** PATCH /api/account/profile — nome ed email. Cambiare email richiede la password attuale. */
export const patchProfile = asyncHandler<{}, AuthResponse | ApiError, unknown, unknown>(async (req, res) => {
  const fields = asRecord(req.body);
  const user = req.user!;
  const name = text(fields.name);
  const email = text(fields.email).toLowerCase();

  if (!isPersonName(name)) return res.status(400).json({ error: "Nome non valido" });
  if (!isEmail(email)) return res.status(400).json({ error: "Email non valida" });
  if (email !== user.email && !(await isCurrentPassword(user.id, password(fields.currentPassword)))) {
    return res.status(400).json({ error: "Per cambiare email inserisci la password attuale corretta" });
  }

  try {
    return res.json({ user: await updateProfile(user.id, name, email) });
  } catch (err) {
    if (err instanceof EmailTakenError) {
      return res.status(409).json({ error: "Esiste già un account con questa email" });
    }
    throw err;
  }
});

/** PUT /api/account/password — cambia la password e chiude le altre sessioni */
export const putPassword = asyncHandler<{}, AuthResponse | ApiError, unknown, unknown>(async (req, res) => {
  const fields = asRecord(req.body);
  const user = req.user!;
  const newPassword = password(fields.newPassword);

  const invalid = passwordError(newPassword);
  if (invalid) return res.status(400).json({ error: invalid });
  if (!(await isCurrentPassword(user.id, password(fields.currentPassword)))) {
    return res.status(400).json({ error: "La password attuale non è corretta" });
  }

  await changePassword(user.id, newPassword);
  await startSession(res, user); // questa sessione resta aperta, con il nuovo numero di versione
  return res.json({ user });
});
