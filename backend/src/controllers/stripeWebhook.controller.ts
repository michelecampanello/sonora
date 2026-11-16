import type { RequestHandler } from "express";
import { syncCheckoutSession } from "../services/payments.service.js";
import { checkoutSessionFromEvent, parseWebhookEvent } from "../services/stripe.service.js";
import { confirmPaidOrder } from "./orders.controller.js";

/**
 * POST /api/stripe/webhook — Stripe avvisa il server quando un pagamento va a buon fine o una pagina scade.
 * La firma prova che la notifica viene da Stripe: va controllata sul corpo esatto, quindi questa rotta
 * riceve il corpo grezzo (express.raw) e non quello già letto come JSON.
 * Se la risposta non è 2xx Stripe riprova per qualche giorno: per questo un errore interno risponde 500.
 * Documentazione: https://docs.stripe.com/webhooks
 */
export const postStripeWebhook: RequestHandler = async (req, res, next) => {
  const signature = req.header("stripe-signature");
  if (!signature || !Buffer.isBuffer(req.body)) {
    res.status(400).json({ error: "Notifica non valida" });
    return;
  }

  let event;
  try {
    event = parseWebhookEvent(req.body, signature);
  } catch (err) {
    console.error(err);
    res.status(400).json({ error: "Firma della notifica non valida" });
    return;
  }

  try {
    const session = checkoutSessionFromEvent(event);
    const result = session ? await syncCheckoutSession(session) : null;
    res.json({ received: true });
    if (result) confirmPaidOrder(result.outcome, result.order);
  } catch (err) {
    next(err);
  }
};
