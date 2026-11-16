import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { passwordResetEmail } from "../../src/emails/passwordReset.js";

// Un finto Resend: nessuna email reale, e si può decidere cosa risponde l'API
const send = vi.fn();
vi.mock("resend", () => ({
  Resend: vi.fn(function (this: { emails: unknown }) {
    this.emails = { send };
  }),
}));

const LINK = "http://localhost:5173/reimposta-password#token=abc123";

/** Ricarica il servizio con le variabili d'ambiente indicate, come all'avvio del server */
async function loadMailService(env: Record<string, string>) {
  for (const [name, value] of Object.entries(env)) vi.stubEnv(name, value);
  vi.resetModules();
  return import("../../src/services/mail.service.js");
}

beforeEach(() => {
  send.mockReset();
  send.mockResolvedValue({ data: { id: "email-1" }, error: null, headers: null });
});
afterEach(() => vi.unstubAllEnvs());

describe("passwordResetEmail", () => {
  it("contiene il link sia nella versione HTML sia in quella testo", () => {
    const { subject, html, text } = passwordResetEmail(LINK);
    expect(subject).toBe("Reimposta la password di Sonora");
    expect(text).toContain(LINK);
    expect(html).toContain(`href="${LINK}"`);
    expect(html).toContain('lang="it"');
  });

  it("protegge l'HTML da caratteri speciali nel link", () => {
    const { html } = passwordResetEmail('https://example.com/"><script>alert(1)</script>');
    expect(html).not.toContain("<script>");
    expect(html).toContain("&quot;&gt;&lt;script&gt;");
  });
});

describe("sendPasswordResetEmail", () => {
  it("senza RESEND_API_KEY stampa il link nella console e non invia nulla", async () => {
    const log = vi.spyOn(console, "log").mockImplementation(() => {});
    const { sendPasswordResetEmail } = await loadMailService({ RESEND_API_KEY: "", NODE_ENV: "development" });

    await sendPasswordResetEmail("mario@example.com", LINK);

    expect(send).not.toHaveBeenCalled();
    expect(log).toHaveBeenCalledWith(expect.stringContaining(LINK));
    log.mockRestore();
  });

  it("con la chiave invia con Resend, dal mittente configurato", async () => {
    const { sendPasswordResetEmail } = await loadMailService({ RESEND_API_KEY: "re_test", MAIL_FROM: "Sonora <noreply@sonora.example>" });

    await sendPasswordResetEmail("mario@example.com", LINK);

    expect(send).toHaveBeenCalledOnce();
    const [payload] = send.mock.calls[0]!;
    expect(payload).toMatchObject({
      from: "Sonora <noreply@sonora.example>",
      to: "mario@example.com",
      subject: "Reimposta la password di Sonora",
      tags: [{ name: "type", value: "password_reset" }],
    });
    expect(payload.html).toContain(LINK);
    expect(payload.text).toContain(LINK);
  });

  it("in sviluppo, senza MAIL_FROM, usa il mittente di prova di Resend", async () => {
    const { sendPasswordResetEmail } = await loadMailService({ RESEND_API_KEY: "re_test", MAIL_FROM: "", NODE_ENV: "development" });
    await sendPasswordResetEmail("mario@example.com", LINK);
    expect(send.mock.calls[0]![0].from).toBe("Sonora <onboarding@resend.dev>");
  });

  it("se Resend rifiuta l'invio lancia un MailError con il motivo", async () => {
    send.mockResolvedValue({
      data: null,
      error: { name: "validation_error", statusCode: 403, message: "The sonora.example domain is not verified." },
      headers: null,
    });
    const { sendPasswordResetEmail, MailError } = await loadMailService({ RESEND_API_KEY: "re_test", MAIL_FROM: "Sonora <noreply@sonora.example>" });

    const error = await sendPasswordResetEmail("mario@example.com", LINK).catch((err: unknown) => err);
    expect(error).toBeInstanceOf(MailError);
    expect((error as Error).message).toBe(
      "Invio con Resend non riuscito (validation_error, 403): The sonora.example domain is not verified.",
    );
  });

  it("in produzione il server non parte senza chiave o senza mittente", async () => {
    await expect(loadMailService({ NODE_ENV: "production", RESEND_API_KEY: "", MAIL_FROM: "Sonora <a@b.it>" })).rejects.toThrow(/RESEND_API_KEY/);
    await expect(loadMailService({ NODE_ENV: "production", RESEND_API_KEY: "re_test", MAIL_FROM: "" })).rejects.toThrow(/MAIL_FROM/);
    await expect(loadMailService({ NODE_ENV: "production", RESEND_API_KEY: "re_test", MAIL_FROM: "Sonora <a@b.it>" })).resolves.toBeDefined();
  });
});

describe("sendWelcomeEmail e sendOrderConfirmationEmail", () => {
  const order = {
    id: "3f2a9c1e-7a8d-4b5e-9f3a-2c1d0e9f8a7b",
    total: "10.00",
    payment_method: "cod" as const,
    customer: { name: "Mario Rossi", email: "mario@example.com", address: "Via Roma 1", city: "Milano", postal_code: "20100", province: "MI" },
    items: [{ product_id: "p1", name: "Cavo", quantity: 1, unit_price: "10.00" }],
  };

  it("il benvenuto parte verso il nuovo utente, con il link al catalogo", async () => {
    const { sendWelcomeEmail } = await loadMailService({ RESEND_API_KEY: "re_test", MAIL_FROM: "Sonora <noreply@sonora.example>", FRONTEND_ORIGIN: "https://sonora.example" });

    await sendWelcomeEmail("giulia@example.com", "Giulia");

    const [payload] = send.mock.calls[0]!;
    expect(payload).toMatchObject({ to: "giulia@example.com", subject: "Ti diamo il benvenuto su Sonora", tags: [{ name: "type", value: "welcome" }] });
    expect(payload.text).toContain("https://sonora.example/catalogo");
  });

  it("la conferma va all'email del checkout e porta all'ordine solo se c'è un account", async () => {
    const { sendOrderConfirmationEmail } = await loadMailService({ RESEND_API_KEY: "re_test", MAIL_FROM: "Sonora <noreply@sonora.example>", FRONTEND_ORIGIN: "https://sonora.example" });

    await sendOrderConfirmationEmail(order, true);
    await sendOrderConfirmationEmail(order, false);

    const [withAccount] = send.mock.calls[0]!;
    const [guest] = send.mock.calls[1]!;
    expect(withAccount).toMatchObject({ to: "mario@example.com", subject: "Ordine 3F2A9C1E confermato", tags: [{ name: "type", value: "order_confirmation" }] });
    expect(withAccount.text).toContain(`https://sonora.example/account/ordini/${order.id}`);
    expect(guest.text).not.toContain("/account/ordini/");
  });
});
