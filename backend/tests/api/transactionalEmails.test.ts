import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { sendOrderConfirmationEmail, sendWelcomeEmail } from "../../src/services/mail.service.js";
import { api, createProduct, customer, signedInAgent, uniqueEmail } from "../helpers.js";

// Le email sono finte: qui si controlla quando partono e che un errore di invio non blocchi nulla
vi.mock("../../src/services/mail.service.js", () => ({
  sendPasswordResetEmail: vi.fn(),
  sendWelcomeEmail: vi.fn(),
  sendOrderConfirmationEmail: vi.fn(),
}));
const welcome = vi.mocked(sendWelcomeEmail);
const orderConfirmation = vi.mocked(sendOrderConfirmationEmail);

beforeEach(() => {
  welcome.mockReset().mockResolvedValue();
  orderConfirmation.mockReset().mockResolvedValue();
});
afterEach(() => vi.restoreAllMocks());

const register = (email: string) =>
  api().post("/api/auth/register").send({ first_name: "Giulia", last_name: "Bianchi", email, password: "password-di-prova" });

describe("email di benvenuto", () => {
  it("parte dopo la registrazione, all'indirizzo dell'account", async () => {
    const email = uniqueEmail();
    await register(email).expect(201);
    await vi.waitFor(() => expect(welcome).toHaveBeenCalledWith(email, "Giulia"));
  });

  it("se l'invio non riesce l'account viene creato lo stesso", async () => {
    const logError = vi.spyOn(console, "error").mockImplementation(() => {});
    welcome.mockRejectedValueOnce(new Error("Resend non raggiungibile"));

    const email = uniqueEmail();
    await register(email).expect(201);
    await vi.waitFor(() => expect(logError).toHaveBeenCalled());
    await api().post("/api/auth/login").send({ email, password: "password-di-prova" }).expect(200);
  });

  it("non parte se la registrazione fallisce", async () => {
    await api().post("/api/auth/register").send({ first_name: "Giulia", last_name: "Bianchi", email: "non-valida", password: "password-di-prova" }).expect(400);
    expect(welcome).not.toHaveBeenCalled();
  });
});

describe("email di conferma dell'ordine", () => {
  it("per un ospite parte senza link all'area personale", async () => {
    const product = await createProduct({ price: "20.00" });
    const res = await api().post("/api/orders").send({ customer, items: [{ productId: product.id, quantity: 2 }] }).expect(201);

    await vi.waitFor(() => expect(orderConfirmation).toHaveBeenCalledOnce());
    const [order, withAccountLink] = orderConfirmation.mock.calls[0]!;
    expect(order).toMatchObject({ id: res.body.id, total: "40.00", customer: { email: customer.email } });
    expect(withAccountLink).toBe(false);
  });

  it("per chi ha fatto l'accesso porta all'ordine nell'area personale", async () => {
    const { agent } = await signedInAgent();
    const product = await createProduct();
    await agent.post("/api/orders").send({ customer, items: [{ productId: product.id, quantity: 1 }] }).expect(201);

    await vi.waitFor(() => expect(orderConfirmation).toHaveBeenCalledOnce());
    expect(orderConfirmation.mock.calls[0]![1]).toBe(true);
  });

  it("se l'invio non riesce l'ordine resta confermato", async () => {
    const logError = vi.spyOn(console, "error").mockImplementation(() => {});
    orderConfirmation.mockRejectedValueOnce(new Error("Resend non raggiungibile"));
    const product = await createProduct();

    await api().post("/api/orders").send({ customer, items: [{ productId: product.id, quantity: 1 }] }).expect(201);
    await vi.waitFor(() => expect(logError).toHaveBeenCalled());
  });

  it("non parte se l'ordine non va a buon fine", async () => {
    const product = await createProduct({ stock: 1 });
    await api().post("/api/orders").send({ customer, items: [{ productId: product.id, quantity: 5 }] }).expect(409);
    expect(orderConfirmation).not.toHaveBeenCalled();
  });
});
