import { randomUUID } from "node:crypto";
import Stripe from "stripe";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { pool } from "../../src/db.js";
import { sendOrderConfirmationEmail } from "../../src/services/mail.service.js";
import {
  createCheckoutSession,
  expireCheckoutSession,
  refundPayment,
  retrieveCheckoutSession,
  type CheckoutSessionState,
} from "../../src/services/stripe.service.js";
import { api, createProduct, customer, signedInAgent, stockOf } from "../helpers.js";

// Stripe è finto: le richieste verso Stripe sono sostituite, la verifica della firma dei webhook resta quella vera
vi.mock("../../src/services/stripe.service.js", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../../src/services/stripe.service.js")>()),
  createCheckoutSession: vi.fn(),
  retrieveCheckoutSession: vi.fn(),
  expireCheckoutSession: vi.fn(),
  refundPayment: vi.fn(),
}));
vi.mock("../../src/services/mail.service.js", () => ({
  sendPasswordResetEmail: vi.fn(),
  sendWelcomeEmail: vi.fn(),
  sendOrderConfirmationEmail: vi.fn(),
}));

const createSession = vi.mocked(createCheckoutSession);
const retrieveSession = vi.mocked(retrieveCheckoutSession);
const expireSession = vi.mocked(expireCheckoutSession);
const refund = vi.mocked(refundPayment);
const orderConfirmation = vi.mocked(sendOrderConfirmationEmail);

const WEBHOOK_SECRET = "whsec_segreto_usato_solo_nei_test";

beforeEach(() => {
  vi.stubEnv("STRIPE_SECRET_KEY", "sk_test_chiave_finta");
  vi.stubEnv("STRIPE_WEBHOOK_SECRET", WEBHOOK_SECRET);
  createSession.mockReset().mockImplementation(async () => {
    const id = `cs_test_${randomUUID().replaceAll("-", "")}`;
    return { id, url: `https://checkout.stripe.com/c/pay/${id}` };
  });
  retrieveSession.mockReset();
  expireSession.mockReset();
  refund.mockReset().mockResolvedValue();
  orderConfirmation.mockReset().mockResolvedValue();
});
afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

/** Un ordine con carta appena creato: il cliente sta per andare su Stripe */
async function placeCardOrder({ quantity = 2, stock = 10, agent = api() } = {}) {
  const product = await createProduct({ price: "25.50", stock });
  const res = await agent
    .post("/api/orders")
    .send({ customer, items: [{ productId: product.id, quantity }], payment_method: "card" })
    .expect(201);
  const sessionId = /cs_test_\w+$/.exec(res.body.checkout_url)![0];
  return { orderId: res.body.id as string, sessionId, product, body: res.body };
}

const session = (
  id: string,
  orderId: string,
  status: string,
  paymentStatus: string,
): CheckoutSessionState => ({ id, orderId, status, paymentStatus, paymentIntentId: paymentStatus === "paid" ? `pi_${orderId}` : null });

async function orderRow(orderId: string) {
  const { rows } = await pool.query<{ status: string; paid_at: Date | null; stripe_payment_intent_id: string | null }>(
    "SELECT status, paid_at, stripe_payment_intent_id FROM orders WHERE id = $1",
    [orderId],
  );
  return rows[0]!;
}

/** Invia al server una notifica firmata come la firmerebbe Stripe */
function sendWebhook(type: string, state: CheckoutSessionState, secret = WEBHOOK_SECRET) {
  const payload = JSON.stringify({
    id: `evt_${randomUUID()}`,
    object: "event",
    type,
    data: {
      object: {
        id: state.id,
        object: "checkout.session",
        client_reference_id: state.orderId,
        status: state.status,
        payment_status: state.paymentStatus,
        payment_intent: state.paymentIntentId,
      },
    },
  });
  const signature = Stripe.webhooks.generateTestHeaderString({ payload, secret });
  return api()
    .post("/api/stripe/webhook")
    .set("Content-Type", "application/json")
    .set("Stripe-Signature", signature)
    .send(payload);
}

describe("metodi di pagamento", () => {
  it("la carta c'è solo con le chiavi di Stripe configurate", async () => {
    expect((await api().get("/api/orders/payment-options").expect(200)).body).toEqual({ card: true });

    vi.stubEnv("STRIPE_WEBHOOK_SECRET", "");
    expect((await api().get("/api/orders/payment-options").expect(200)).body).toEqual({ card: false });
    const product = await createProduct();
    const res = await api()
      .post("/api/orders")
      .send({ customer, items: [{ productId: product.id, quantity: 1 }], payment_method: "card" })
      .expect(400);
    expect(res.body.error).toMatch(/carta non è disponibile/);
    expect(await stockOf(product.id)).toBe(5);
  });

  it("rifiuta un metodo sconosciuto", async () => {
    const product = await createProduct();
    await api()
      .post("/api/orders")
      .send({ customer, items: [{ productId: product.id, quantity: 1 }], payment_method: "bitcoin" })
      .expect(400);
  });
});

describe("ordine con carta", () => {
  it("riserva i pezzi, crea la pagina di Stripe con i prezzi del server e aspetta il pagamento per l'email", async () => {
    const { orderId, product, body } = await placeCardOrder({ quantity: 2, stock: 10 });

    expect(body).toMatchObject({ id: orderId, total: "51.00", payment_method: "card" });
    expect(body.checkout_url).toMatch(/^https:\/\/checkout\.stripe\.com\//);
    expect(createSession).toHaveBeenCalledWith({
      id: orderId,
      email: customer.email,
      items: [expect.objectContaining({ product_id: product.id, quantity: 2, unit_price: "25.50" })],
    });
    expect(await stockOf(product.id)).toBe(8);
    expect(await orderRow(orderId)).toMatchObject({ status: "awaiting_payment", paid_at: null });
    expect(orderConfirmation).not.toHaveBeenCalled();
  });

  it("se Stripe non risponde annulla l'ordine e rimette i pezzi in magazzino", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    createSession.mockRejectedValueOnce(new Error("Stripe non raggiungibile"));
    const product = await createProduct({ stock: 3 });

    const res = await api()
      .post("/api/orders")
      .send({ customer, items: [{ productId: product.id, quantity: 2 }], payment_method: "card" })
      .expect(502);

    expect(res.body.error).toMatch(/riprova/);
    expect(await stockOf(product.id)).toBe(3);
    const { rows } = await pool.query("SELECT status FROM orders o JOIN order_items i ON i.order_id = o.id WHERE i.product_id = $1", [
      product.id,
    ]);
    expect(rows).toEqual([{ status: "cancelled" }]);
  });

  it("un ordine in attesa di pagamento non si cambia dal pannello", async () => {
    const { orderId } = await placeCardOrder();
    const { agent: admin } = await signedInAgent("admin");
    expect((await admin.get(`/api/admin/orders/${orderId}`).expect(200)).body.next_statuses).toEqual([]);
    await admin.patch(`/api/admin/orders/${orderId}/status`).send({ status: "shipped" }).expect(409);
  });
});

describe("webhook di Stripe", () => {
  it("al pagamento mette l'ordine in lavorazione e manda l'email una volta sola, anche se la notifica si ripete", async () => {
    const { agent } = await signedInAgent();
    const { orderId, sessionId, product } = await placeCardOrder({ agent });
    const paid = session(sessionId, orderId, "complete", "paid");

    await sendWebhook("checkout.session.completed", paid).expect(200);
    await sendWebhook("checkout.session.completed", paid).expect(200);

    const row = await orderRow(orderId);
    expect(row.status).toBe("pending");
    expect(row.paid_at).not.toBeNull();
    expect(row.stripe_payment_intent_id).toBe(`pi_${orderId}`);
    expect(await stockOf(product.id)).toBe(8);
    await vi.waitFor(() => expect(orderConfirmation).toHaveBeenCalledTimes(1));
    // L'ordine è di un utente con account: l'email porta alla sua pagina
    expect(orderConfirmation).toHaveBeenCalledWith(expect.objectContaining({ id: orderId, payment_method: "card" }), true);
  });

  it("alla scadenza della pagina annulla l'ordine e rimette i pezzi in magazzino", async () => {
    const { orderId, sessionId, product } = await placeCardOrder({ quantity: 3, stock: 4 });
    await sendWebhook("checkout.session.expired", session(sessionId, orderId, "expired", "unpaid")).expect(200);

    expect((await orderRow(orderId)).status).toBe("cancelled");
    expect(await stockOf(product.id)).toBe(4);
    expect(orderConfirmation).not.toHaveBeenCalled();
  });

  it("rifiuta una notifica con la firma sbagliata e non tocca l'ordine", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    const { orderId, sessionId } = await placeCardOrder();
    await sendWebhook("checkout.session.completed", session(sessionId, orderId, "complete", "paid"), "whsec_falso").expect(400);
    await api().post("/api/stripe/webhook").set("Content-Type", "application/json").send("{}").expect(400);

    expect(await orderRow(orderId)).toMatchObject({ status: "awaiting_payment", paid_at: null });
  });

  it("risponde 200 agli eventi che non riguardano gli ordini", async () => {
    await sendWebhook("checkout.session.completed", session("cs_test_sconosciuta", randomUUID(), "complete", "paid")).expect(200);
  });

  it("se arriva un pagamento per un ordine già annullato, lo rimborsa", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    const { orderId, sessionId } = await placeCardOrder();
    await sendWebhook("checkout.session.expired", session(sessionId, orderId, "expired", "unpaid")).expect(200);
    await sendWebhook("checkout.session.completed", session(sessionId, orderId, "complete", "paid")).expect(200);

    expect(refund).toHaveBeenCalledWith(`pi_${orderId}`, orderId);
    expect((await orderRow(orderId)).status).toBe("cancelled");
    expect(orderConfirmation).not.toHaveBeenCalled();
  });
});

describe("ritorno da Stripe", () => {
  it("la pagina di conferma chiede a Stripe lo stato se il webhook non è ancora arrivato", async () => {
    const { orderId, sessionId } = await placeCardOrder();
    retrieveSession.mockResolvedValueOnce(session(sessionId, orderId, "complete", "paid"));

    const res = await api().get(`/api/orders/checkout/${sessionId}`).expect(200);

    expect(res.body).toMatchObject({ status: "pending", paid: true, order: { id: orderId, total: "51.00", customer: { name: customer.name } } });
    expect(res.body).not.toHaveProperty("sessionId");
    expect(res.body).not.toHaveProperty("paymentIntentId");
    // Ordine da ospite: l'email non porta all'area personale
    await vi.waitFor(() => expect(orderConfirmation).toHaveBeenCalledWith(expect.objectContaining({ id: orderId }), false));

    // Una seconda visita non chiede più nulla a Stripe e non rimanda l'email
    await api().get(`/api/orders/checkout/${sessionId}`).expect(200);
    expect(retrieveSession).toHaveBeenCalledTimes(1);
    expect(orderConfirmation).toHaveBeenCalledTimes(1);
  });

  it("risponde 404 per una sessione sconosciuta o malformata", async () => {
    await api().get("/api/orders/checkout/cs_test_sconosciuta").expect(404);
    await api().get("/api/orders/checkout/non-una-sessione").expect(404);
  });

  it("tornando senza pagare chiude la pagina di Stripe e annulla l'ordine", async () => {
    const { orderId, sessionId, product } = await placeCardOrder({ quantity: 2, stock: 5 });
    expireSession.mockResolvedValueOnce(session(sessionId, orderId, "expired", "unpaid"));

    const res = await api().post(`/api/orders/${orderId}/cancel-payment`).expect(200);

    expect(res.body).toMatchObject({ status: "cancelled", paid: false, order: { id: orderId } });
    expect(expireSession).toHaveBeenCalledWith(sessionId);
    expect(await stockOf(product.id)).toBe(5);
  });

  it("se nel frattempo il pagamento è arrivato, l'ordine resta valido", async () => {
    const { orderId, sessionId, product } = await placeCardOrder({ quantity: 2, stock: 5 });
    expireSession.mockResolvedValueOnce(session(sessionId, orderId, "complete", "paid"));

    const res = await api().post(`/api/orders/${orderId}/cancel-payment`).expect(200);

    expect(res.body).toMatchObject({ status: "pending", paid: true, order: { id: orderId, total: "51.00" } });
    expect(await stockOf(product.id)).toBe(3);
    await vi.waitFor(() => expect(orderConfirmation).toHaveBeenCalledTimes(1));
  });

  it("non annulla gli ordini con pagamento alla consegna", async () => {
    const product = await createProduct();
    const cod = await api()
      .post("/api/orders")
      .send({ customer, items: [{ productId: product.id, quantity: 1 }] })
      .expect(201);
    await api().post(`/api/orders/${cod.body.id}/cancel-payment`).expect(404);
    expect(await stockOf(product.id)).toBe(4);
  });
});

describe("annullamento dal pannello", () => {
  it("rimborsa su Stripe un ordine già pagato, e l'incasso non lo conta più", async () => {
    const { agent: admin } = await signedInAgent("admin");
    const { orderId, sessionId, product } = await placeCardOrder({ quantity: 2, stock: 10 });
    await sendWebhook("checkout.session.completed", session(sessionId, orderId, "complete", "paid")).expect(200);
    const before = (await admin.get("/api/admin/stats").expect(200)).body;

    await admin.patch(`/api/admin/orders/${orderId}/status`).send({ status: "cancelled" }).expect(200);

    expect(refund).toHaveBeenCalledWith(`pi_${orderId}`, orderId);
    expect(await stockOf(product.id)).toBe(10);
    const after = (await admin.get("/api/admin/stats").expect(200)).body;
    expect(Number(before.revenue) - Number(after.revenue)).toBeCloseTo(51, 2);
  });

  it("se il rimborso non riesce l'ordine resta com'era", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    const { agent: admin } = await signedInAgent("admin");
    const { orderId, sessionId, product } = await placeCardOrder({ quantity: 2, stock: 10 });
    await sendWebhook("checkout.session.completed", session(sessionId, orderId, "complete", "paid")).expect(200);
    refund.mockRejectedValueOnce(new Error("Stripe non raggiungibile"));

    await admin.patch(`/api/admin/orders/${orderId}/status`).send({ status: "cancelled" }).expect(500);

    expect((await orderRow(orderId)).status).toBe("pending");
    expect(await stockOf(product.id)).toBe(8);
  });
});
