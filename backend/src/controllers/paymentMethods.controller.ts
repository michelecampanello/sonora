import { asyncHandler } from "../asyncHandler.js";
import {
  createPaymentMethod,
  deletePaymentMethod,
  listPaymentMethods,
  setDefaultPaymentMethod,
  type PaymentMethodFields,
} from "../services/paymentMethods.service.js";
import { RecordLimitError } from "../services/savedRecords.js";
import { isUuid } from "../uuid.js";
import { asRecord, isPersonName, text } from "../validation.js";
import { CARD_BRANDS, type ApiError, type CardBrand, type PaymentMethod } from "../types.js";

type ListResponse = PaymentMethod[] | ApiError;

const NOT_FOUND = { error: "Metodo di pagamento non trovato" };
const MAX_YEARS_AHEAD = 20;

const isCardBrand = (value: string): value is CardBrand => (CARD_BRANDS as readonly string[]).includes(value);

/** Legge solo i campi previsti: qualsiasi altro dato inviato, come un numero di carta, viene ignorato */
function parsePaymentMethod(value: unknown): PaymentMethodFields | string {
  const source = asRecord(value);
  const brand = text(source.brand);
  const last4 = text(source.last4);
  const holder = text(source.holder);
  const { exp_month: month, exp_year: year } = source;

  if (!isCardBrand(brand)) return "Circuito non valido";
  if (!/^\d{4}$/.test(last4)) return "Inserisci le ultime 4 cifre della carta";
  if (!isPersonName(holder)) return "Intestatario non valido";
  if (typeof month !== "number" || !Number.isInteger(month) || month < 1 || month > 12) return "Mese di scadenza non valido";

  const now = new Date();
  const currentYear = now.getFullYear();
  if (typeof year !== "number" || !Number.isInteger(year) || year > currentYear + MAX_YEARS_AHEAD) return "Anno di scadenza non valido";
  if (year < currentYear || (year === currentYear && month < now.getMonth() + 1)) return "La carta è scaduta";

  return { brand, last4, holder, exp_month: month, exp_year: year };
}

/** GET /api/account/payment-methods */
export const getPaymentMethods = asyncHandler<{}, PaymentMethod[], unknown, unknown>(async (req, res) => {
  res.json(await listPaymentMethods(req.user!.id));
});

/** POST /api/account/payment-methods — il primo metodo diventa il predefinito */
export const postPaymentMethod = asyncHandler<{}, ListResponse, unknown, unknown>(async (req, res) => {
  const fields = parsePaymentMethod(req.body);
  if (typeof fields === "string") return res.status(400).json({ error: fields });

  try {
    await createPaymentMethod(req.user!.id, fields);
  } catch (err) {
    if (err instanceof RecordLimitError) {
      return res.status(409).json({ error: "Hai raggiunto il numero massimo di metodi di pagamento" });
    }
    throw err;
  }
  return res.status(201).json(await listPaymentMethods(req.user!.id));
});

/** DELETE /api/account/payment-methods/:id */
export const removePaymentMethod = asyncHandler<{ id: string }, ListResponse, unknown, unknown>(async (req, res) => {
  if (!isUuid(req.params.id) || !(await deletePaymentMethod(req.user!.id, req.params.id))) {
    return res.status(404).json(NOT_FOUND);
  }
  return res.json(await listPaymentMethods(req.user!.id));
});

/** POST /api/account/payment-methods/:id/default */
export const makePaymentMethodDefault = asyncHandler<{ id: string }, ListResponse, unknown, unknown>(async (req, res) => {
  if (!isUuid(req.params.id) || !(await setDefaultPaymentMethod(req.user!.id, req.params.id))) {
    return res.status(404).json(NOT_FOUND);
  }
  return res.json(await listPaymentMethods(req.user!.id));
});
