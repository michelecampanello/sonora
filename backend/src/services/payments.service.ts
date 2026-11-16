import type { OrderConfirmation } from "../types.js";
import { pool } from "../lib/db.js";
import {
  applyCheckoutSession,
  cancelAndRestock,
  findCardOrder,
  setCheckoutSession,
  type CardOrder,
  type PaymentOutcome,
} from "./orders.service.js";
import {
  createCheckoutSession,
  expireCheckoutSession,
  refundPayment,
  type CheckoutSessionState,
} from "./stripe.service.js";

/**
 * Il percorso di un ordine pagato con carta:
 * 1. createOrder lo salva "awaiting_payment" e riserva i pezzi
 * 2. startCardCheckout crea la pagina di pagamento su Stripe, dove va il cliente
 * 3. Stripe avvisa il server con un webhook (pagato o scaduto), e syncCheckoutSession aggiorna l'ordine.
 *    Lo fa anche la pagina di conferma quando il cliente torna, nel caso il webhook non sia ancora arrivato.
 */

/** Crea la pagina di pagamento. Se Stripe non risponde, l'ordine si annulla e i pezzi tornano in magazzino. */
export async function startCardCheckout(order: OrderConfirmation): Promise<string> {
  try {
    const session = await createCheckoutSession({ id: order.id, email: order.customer.email, items: order.items });
    await setCheckoutSession(order.id, session.id);
    return session.url;
  } catch (err) {
    await cancelOrder(order.id).catch((cancelErr: unknown) => console.error(cancelErr));
    throw err;
  }
}

async function cancelOrder(orderId: string): Promise<void> {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const { rowCount } = await client.query(
      "SELECT 1 FROM orders WHERE id = $1 AND status = 'awaiting_payment' FOR UPDATE",
      [orderId],
    );
    if (rowCount) await cancelAndRestock(client, orderId);
    await client.query("COMMIT");
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
}

/**
 * Aggiorna l'ordine con lo stato della sessione di Stripe. Se un ordine annullato risulta pagato, rimborsa subito.
 * L'esito "paid" arriva una volta sola per ordine: chi lo riceve invia l'email di conferma.
 */
export async function syncCheckoutSession(
  session: CheckoutSessionState,
): Promise<{ outcome: PaymentOutcome; order: CardOrder } | null> {
  const result = await applyCheckoutSession(session);
  if (result?.outcome === "refund_needed" && result.order.paymentIntentId) {
    console.error(`Ordine ${result.order.order.id} pagato dopo l'annullamento: rimborso`);
    await refundPayment(result.order.paymentIntentId, result.order.order.id);
  }
  return result;
}

/**
 * Il cliente è tornato dalla pagina di Stripe senza pagare: la si chiude subito, così i pezzi tornano
 * in magazzino senza aspettare la scadenza. Se intanto ha pagato, l'ordine risulta pagato e non si annulla.
 * Restituisce null se l'ordine non esiste o non è con carta.
 */
export async function cancelCardCheckout(orderId: string): Promise<{ outcome: PaymentOutcome; order: CardOrder } | null> {
  const order = await findCardOrder(orderId);
  if (!order) return null;
  if (order.status !== "awaiting_payment") return { outcome: "unchanged", order };
  if (!order.sessionId) {
    // La sessione non è mai stata creata (Stripe non rispondeva): non c'è niente da chiudere su Stripe
    await cancelOrder(orderId);
    const cancelled = await findCardOrder(orderId);
    return cancelled && { outcome: "cancelled", order: cancelled };
  }
  return (await syncCheckoutSession(await expireCheckoutSession(order.sessionId))) ?? { outcome: "unchanged", order };
}
