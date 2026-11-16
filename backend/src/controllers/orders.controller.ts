import { asyncHandler } from "../lib/asyncHandler.js";
import { runAfterResponse } from "../lib/background.js";
import { isEmail } from "../lib/email.js";
import { isUuid } from "../lib/uuid.js";
import { sendOrderConfirmationEmail } from "../services/mail.service.js";
import {
  createOrder,
  findCardOrderBySession,
  InsufficientStockError,
  type CardOrder,
  type CartLine,
  type PaymentOutcome,
} from "../services/orders.service.js";
import { cancelCardCheckout, startCardCheckout, syncCheckoutSession } from "../services/payments.service.js";
import { cardPaymentsEnabled, retrieveCheckoutSession } from "../services/stripe.service.js";
import { isPersonName, isRecord, locationError, parseLocation, text } from "../lib/validation.js";
import {
  PAYMENT_METHODS,
  type ApiError,
  type OrderConfirmation,
  type OrderCustomer,
  type OrderStatus,
  type PaymentMethod,
} from "../types.js";

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

/** Senza metodo indicato vale il pagamento alla consegna, come prima dell'arrivo della carta */
function parsePaymentMethod(value: unknown): PaymentMethod | string {
  if (value === undefined) return "cod";
  if (!PAYMENT_METHODS.includes(value as PaymentMethod)) return "Metodo di pagamento non valido";
  if (value === "card" && !cardPaymentsEnabled()) return "Il pagamento con carta non è disponibile";
  return value as PaymentMethod;
}

/** GET /api/orders/payment-options — i metodi di pagamento che il checkout può proporre */
export const getPaymentOptions = asyncHandler<{}, { card: boolean }, unknown, unknown>(async (_req, res) => {
  res.json({ card: cardPaymentsEnabled() });
});

/**
 * POST /api/orders — crea un ordine e scala il magazzino, collegandolo all'utente se ha fatto l'accesso.
 * Il client manda solo prodotti, quantità e metodo di pagamento: prezzi e totale li decide sempre il server.
 * Con la carta risponde anche con checkout_url, la pagina di Stripe a cui mandare il cliente.
 */
export const postOrder = asyncHandler<{}, (OrderConfirmation & { checkout_url?: string }) | ApiError, unknown, unknown>(
  async (req, res) => {
    const body: Record<string, unknown> = isRecord(req.body) ? req.body : {};
    const customer = parseCustomer(body.customer);
    if (typeof customer === "string") return res.status(400).json({ error: customer });
    const lines = parseItems(body.items);
    if (typeof lines === "string") return res.status(400).json({ error: lines });
    const paymentMethod = parsePaymentMethod(body.payment_method);
    if (paymentMethod !== "cod" && paymentMethod !== "card") return res.status(400).json({ error: paymentMethod });

    let order: OrderConfirmation;
    try {
      order = await createOrder(customer, lines, req.user?.id ?? null, paymentMethod);
    } catch (err) {
      if (err instanceof InsufficientStockError) {
        return res.status(409).json({ error: err.message });
      }
      throw err;
    }

    if (paymentMethod === "card") {
      let checkoutUrl: string;
      try {
        checkoutUrl = await startCardCheckout(order);
      } catch (err) {
        console.error(err);
        return res.status(502).json({ error: "Il pagamento con carta non è disponibile in questo momento, riprova tra poco" });
      }
      // L'email di conferma parte solo quando arriva il pagamento
      return res.status(201).json({ ...order, checkout_url: checkoutUrl });
    }

    res.status(201).json(order);
    // Dopo la risposta: l'ordine è già salvato, e un problema con l'email non deve farlo sembrare fallito
    runAfterResponse(sendOrderConfirmationEmail(order, Boolean(req.user)));
    return undefined;
  },
);

/** Quello che il cliente vede di un ordine con carta: niente id interni di Stripe */
export interface CardOrderStatus {
  order: OrderConfirmation;
  status: OrderStatus;
  paid: boolean;
}

const publicView = ({ order, status, paid }: CardOrder): CardOrderStatus => ({ order, status, paid });

/** Il pagamento è appena arrivato: conferma l'ordine per email, dopo aver risposto */
export function confirmPaidOrder(outcome: PaymentOutcome, order: CardOrder): void {
  if (outcome === "paid") runAfterResponse(sendOrderConfirmationEmail(order.order, order.userId !== null));
}

const SESSION_ID = /^cs_(test|live)_[A-Za-z0-9]{1,250}$/;

/**
 * GET /api/orders/checkout/:sessionId — l'ordine pagato, per la pagina di conferma a cui Stripe rimanda il cliente.
 * L'id della sessione è lungo e casuale e lo conosce solo chi ha pagato: come per la conferma del contrassegno,
 * basta per mostrare il riepilogo anche a chi ha comprato senza account.
 * Se il webhook non è ancora arrivato, chiede a Stripe lo stato del pagamento e aggiorna l'ordine.
 */
export const getCheckoutResult = asyncHandler<{ sessionId: string }, CardOrderStatus | ApiError, unknown, unknown>(async (req, res) => {
  const { sessionId } = req.params;
  if (!SESSION_ID.test(sessionId)) return res.status(404).json({ error: "Ordine non trovato" });

  const order = await findCardOrderBySession(sessionId);
  if (!order) return res.status(404).json({ error: "Ordine non trovato" });
  if (order.status !== "awaiting_payment") return res.json(publicView(order));

  const result = await syncCheckoutSession(await retrieveCheckoutSession(sessionId));
  if (!result) return res.json(publicView(order));
  res.json(publicView(result.order));
  confirmPaidOrder(result.outcome, result.order);
  return undefined;
});

/**
 * POST /api/orders/:id/cancel-payment — il cliente è tornato da Stripe senza pagare.
 * Chiude la pagina di pagamento e annulla l'ordine, rimettendo i pezzi in magazzino.
 * Se nel frattempo il pagamento è arrivato, l'ordine resta valido e la risposta lo dice, con il riepilogo.
 */
export const postCancelPayment = asyncHandler<{ id: string }, CardOrderStatus | ApiError, unknown, unknown>(
  async (req, res) => {
    if (!isUuid(req.params.id)) return res.status(404).json({ error: "Ordine non trovato" });
    const result = await cancelCardCheckout(req.params.id.toLowerCase());
    if (!result) return res.status(404).json({ error: "Ordine non trovato" });
    res.json(publicView(result.order));
    confirmPaidOrder(result.outcome, result.order);
    return undefined;
  },
);
