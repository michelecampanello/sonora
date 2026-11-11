import { asyncHandler } from "../asyncHandler.js";
import { isEmail } from "../email.js";
import { isUuid } from "../uuid.js";
import { createOrder, InsufficientStockError, type CartLine } from "../services/orders.service.js";
import { isPersonName, isRecord, locationError, parseLocation, text } from "../validation.js";
import type { ApiError, OrderConfirmation, OrderCustomer } from "../types.js";

const MAX_LINES = 50;
const MAX_QUANTITY = 99;

/** Controlla i dati del cliente: restituisce i dati puliti, oppure il messaggio d'errore. */
function parseCustomer(value: unknown): OrderCustomer | string {
  if (!isRecord(value)) return "Dati del cliente mancanti";

  const customer: OrderCustomer = {
    name: text(value.name),
    email: text(value.email),
    ...parseLocation(value),
  };

  if (!isPersonName(customer.name)) return "Nome non valido";
  if (!isEmail(customer.email)) return "Email non valida";
  return locationError(customer) ?? customer;
}

/** Controlla le righe del carrello e unisce eventuali doppioni dello stesso prodotto. */
function parseItems(value: unknown): CartLine[] | string {
  if (!Array.isArray(value) || value.length === 0) return "Il carrello è vuoto";
  if (value.length > MAX_LINES) return "Troppi articoli nel carrello";

  const quantities = new Map<string, number>();
  for (const item of value) {
    if (!isRecord(item)) return "Articolo non valido";
    const { quantity } = item;
    if (!isUuid(item.productId)) return "Articolo non valido";
    // Postgres restituisce gli UUID in minuscolo: serve lo stesso formato per confrontarli
    const productId = item.productId.toLowerCase();
    if (typeof quantity !== "number" || !Number.isInteger(quantity) || quantity <= 0) {
      return "Quantità non valida";
    }
    quantities.set(productId, (quantities.get(productId) ?? 0) + quantity);
  }

  const lines = [...quantities].map(([productId, quantity]) => ({ productId, quantity }));
  if (lines.some((line) => line.quantity > MAX_QUANTITY)) return "Quantità non valida";
  return lines;
}

/**
 * POST /api/orders — crea un ordine e scala il magazzino, collegandolo all'utente se ha fatto l'accesso.
 * Il client manda solo prodotti e quantità: prezzi e totale li decide sempre il server.
 */
export const postOrder = asyncHandler<{}, OrderConfirmation | ApiError, unknown, unknown>(
  async (req, res) => {
    const body: Record<string, unknown> = isRecord(req.body) ? req.body : {};
    const customer = parseCustomer(body.customer);
    if (typeof customer === "string") return res.status(400).json({ error: customer });
    const lines = parseItems(body.items);
    if (typeof lines === "string") return res.status(400).json({ error: lines });

    try {
      return res.status(201).json(await createOrder(customer, lines, req.user?.id ?? null));
    } catch (err) {
      if (err instanceof InsufficientStockError) {
        return res.status(409).json({ error: err.message });
      }
      throw err;
    }
  },
);
