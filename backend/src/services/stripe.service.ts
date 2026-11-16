import Stripe from "stripe";
import { FRONTEND_ORIGIN } from "../config.js";
import type { OrderItem } from "../types.js";

/**
 * Il pagamento con carta passa da Stripe Checkout: il cliente paga su una pagina di Stripe e poi torna sul sito.
 * Il numero della carta non arriva mai al nostro server. Questo file è l'unico che parla con Stripe:
 * nei test lo si sostituisce con una versione finta.
 * Documentazione: https://docs.stripe.com/checkout/quickstart
 */

/** Dopo quanto tempo una pagina di pagamento non usata scade e l'ordine si annulla. 30 minuti è il minimo di Stripe. */
export const CHECKOUT_EXPIRATION_MINUTES = 30;

/** Quello che serve sapere di una sessione di Checkout, senza dipendere dai tipi completi di Stripe */
export interface CheckoutSessionState {
  id: string;
  /** L'ordine a cui appartiene: lo si indica creando la sessione */
  orderId: string | null;
  /** open: il cliente può ancora pagare; complete: ha finito; expired: scaduta o annullata */
  status: string;
  /** paid quando i soldi sono arrivati */
  paymentStatus: string;
  paymentIntentId: string | null;
}

/** Stripe ha rifiutato una richiesta: il messaggio spiega perché, per i log del server */
export class PaymentProviderError extends Error {}

let client: Stripe | null = null;
let clientKey: string | undefined;

/**
 * Il client di Stripe, creato alla prima richiesta. Null senza STRIPE_SECRET_KEY:
 * il negozio funziona lo stesso, con il solo pagamento alla consegna.
 */
function stripe(): Stripe | null {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) return null;
  if (!client || clientKey !== key) {
    client = new Stripe(key, { maxNetworkRetries: 2, timeout: 15_000 });
    clientKey = key;
  }
  return client;
}

function requireStripe(): Stripe {
  const instance = stripe();
  if (!instance) throw new PaymentProviderError("STRIPE_SECRET_KEY non impostata");
  return instance;
}

/** Vero se il pagamento con carta è configurato: servono sia la chiave che il segreto del webhook */
export const cardPaymentsEnabled = (): boolean =>
  Boolean(process.env.STRIPE_SECRET_KEY && process.env.STRIPE_WEBHOOK_SECRET);

function toState(session: Stripe.Checkout.Session): CheckoutSessionState {
  const intent = session.payment_intent;
  return {
    id: session.id,
    orderId: session.client_reference_id,
    status: session.status ?? "open",
    paymentStatus: session.payment_status,
    paymentIntentId: typeof intent === "string" ? intent : (intent?.id ?? null),
  };
}

const toCents = (price: string): number => Math.round(Number(price) * 100);

/**
 * Crea la pagina di pagamento per un ordine. Gli importi vengono dai prezzi salvati nell'ordine, mai dal browser.
 * Restituisce l'id della sessione e l'indirizzo a cui mandare il cliente.
 */
export async function createCheckoutSession(order: {
  id: string;
  email: string;
  items: OrderItem[];
}): Promise<{ id: string; url: string }> {
  const session = await requireStripe().checkout.sessions.create(
    {
      mode: "payment",
      // Solo carte (con Apple Pay e Google Pay): sono istantanee, quindi al ritorno l'ordine è già pagato
      allowed_payment_method_types: ["card"],
      line_items: order.items.map((item) => ({
        quantity: item.quantity,
        price_data: { currency: "eur", unit_amount: toCents(item.unit_price), product_data: { name: item.name } },
      })),
      customer_email: order.email,
      client_reference_id: order.id,
      metadata: { order_id: order.id },
      payment_intent_data: { metadata: { order_id: order.id } },
      locale: "it",
      expires_at: Math.floor(Date.now() / 1000) + CHECKOUT_EXPIRATION_MINUTES * 60,
      // Stripe sostituisce {CHECKOUT_SESSION_ID} con l'id vero: la pagina di conferma lo usa per leggere l'ordine
      success_url: `${FRONTEND_ORIGIN}/ordine-confermato?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${FRONTEND_ORIGIN}/checkout?pagamento_annullato=${order.id}`,
    },
    // Se la richiesta viene ripetuta (es. per un errore di rete) Stripe non crea una seconda sessione
    { idempotencyKey: `checkout-${order.id}` },
  );
  if (!session.url) throw new PaymentProviderError(`Stripe non ha restituito l'indirizzo della sessione ${session.id}`);
  return { id: session.id, url: session.url };
}

export async function retrieveCheckoutSession(sessionId: string): Promise<CheckoutSessionState> {
  return toState(await requireStripe().checkout.sessions.retrieve(sessionId));
}

/**
 * Chiude la pagina di pagamento, così il cliente non può più pagare. Se nel frattempo ha già pagato
 * (o la sessione era già scaduta) Stripe rifiuta: si restituisce lo stato attuale, che dice cosa è successo.
 */
export async function expireCheckoutSession(sessionId: string): Promise<CheckoutSessionState> {
  try {
    return toState(await requireStripe().checkout.sessions.expire(sessionId));
  } catch (err) {
    if (err instanceof Stripe.errors.StripeInvalidRequestError) return retrieveCheckoutSession(sessionId);
    throw err;
  }
}

/** Rimborsa per intero un pagamento. Rilanciarlo per lo stesso ordine non rimborsa due volte. */
export async function refundPayment(paymentIntentId: string, orderId: string): Promise<void> {
  await requireStripe().refunds.create(
    { payment_intent: paymentIntentId, metadata: { order_id: orderId } },
    { idempotencyKey: `refund-${orderId}` },
  );
}

/**
 * Verifica che una notifica arrivi davvero da Stripe, con la firma nell'header Stripe-Signature,
 * e la restituisce. rawBody deve essere il corpo esatto della richiesta, non il JSON già letto.
 * Lancia un errore se la firma non è valida.
 */
export function parseWebhookEvent(rawBody: Buffer, signature: string): Stripe.Event {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret) throw new PaymentProviderError("STRIPE_WEBHOOK_SECRET non impostata");
  return requireStripe().webhooks.constructEvent(rawBody, signature, secret);
}

/** La sessione contenuta in un evento di Checkout, oppure null per gli altri eventi */
export function checkoutSessionFromEvent(event: Stripe.Event): CheckoutSessionState | null {
  switch (event.type) {
    case "checkout.session.completed":
    case "checkout.session.expired":
    case "checkout.session.async_payment_succeeded":
      return toState(event.data.object);
    default:
      return null;
  }
}
