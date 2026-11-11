import type request from "supertest";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { SESSION_COOKIE } from "../../src/middleware/auth.middleware.js";
import { sendPasswordResetEmail } from "../../src/services/mail.service.js";
import { api, createUser, signedInAgent, uniqueEmail } from "../helpers.js";

// Nessuna email reale: il finto invio conserva il link, così il test può usarlo
vi.mock("../../src/services/mail.service.js", () => ({ sendPasswordResetEmail: vi.fn() }));
const sendMail = vi.mocked(sendPasswordResetEmail);

beforeEach(() => sendMail.mockClear());

const sessionCookie = (res: request.Response): string | undefined =>
  ([] as string[]).concat(res.headers["set-cookie"] ?? []).find((c) => c.startsWith(`${SESSION_COOKIE}=`));

describe("POST /api/auth/register", () => {
  it("crea l'account, avvia la sessione e non restituisce la password", async () => {
    const email = uniqueEmail();
    const res = await api()
      .post("/api/auth/register")
      .send({ name: "Giulia Bianchi", email: email.toUpperCase(), password: "password-sicura" })
      .expect(201);

    expect(res.body.user).toMatchObject({ name: "Giulia Bianchi", email, role: "customer" });
    expect(JSON.stringify(res.body)).not.toMatch(/password/);
    expect(sessionCookie(res)).toMatch(/HttpOnly/i);
    expect(sessionCookie(res)).toMatch(/SameSite=Lax/i);
  });

  it("rifiuta un'email già registrata", async () => {
    const user = await createUser();
    await api()
      .post("/api/auth/register")
      .send({ name: "Altro Utente", email: user.email, password: "password-sicura" })
      .expect(409);
  });

  it.each([
    [{ name: "A", email: "a@example.com", password: "password-sicura" }, "Nome non valido"],
    [{ name: "Anna", email: "non-email", password: "password-sicura" }, "Email non valida"],
    [{ name: "Anna", email: "a@example.com", password: "corta" }, "La password deve avere almeno 8 caratteri"],
    [{ name: "Anna", email: "a@example.com", password: 12345678 }, "La password deve avere almeno 8 caratteri"],
  ])("rifiuta dati non validi: %j", async (body, error) => {
    const res = await api().post("/api/auth/register").send(body).expect(400);
    expect(res.body.error).toBe(error);
  });

  it("risponde 400 a un body JSON malformato", async () => {
    await api().post("/api/auth/register").set("Content-Type", "application/json").send("{non json").expect(400);
  });
});

describe("POST /api/auth/login", () => {
  it("avvia la sessione con le credenziali corrette", async () => {
    const user = await createUser();
    const res = await api().post("/api/auth/login").send({ email: user.email, password: user.password }).expect(200);
    expect(res.body.user.email).toBe(user.email);
    expect(sessionCookie(res)).toBeDefined();
  });

  it("dà lo stesso errore per password sbagliata ed email inesistente", async () => {
    const user = await createUser();
    const wrongPassword = await api().post("/api/auth/login").send({ email: user.email, password: "sbagliata" });
    const unknownEmail = await api().post("/api/auth/login").send({ email: uniqueEmail(), password: "sbagliata" });

    expect(wrongPassword.status).toBe(401);
    expect(unknownEmail.status).toBe(401);
    expect(wrongPassword.body).toEqual(unknownEmail.body);
  });
});

describe("sessione", () => {
  it("GET /api/auth/me risponde 401 senza sessione", async () => {
    await api().get("/api/auth/me").expect(401);
  });

  it("GET /api/auth/me risponde 401 con un token falso", async () => {
    await api().get("/api/auth/me").set("Cookie", `${SESSION_COOKIE}=token-inventato`).expect(401);
  });

  it("GET /api/auth/me restituisce l'utente collegato", async () => {
    const { agent, user } = await signedInAgent();
    const res = await agent.get("/api/auth/me").expect(200);
    expect(res.body.user).toMatchObject({ id: user.id, email: user.email });
  });

  it("dopo il logout la sessione è chiusa", async () => {
    const { agent } = await signedInAgent();
    await agent.post("/api/auth/logout").expect(200);
    await agent.get("/api/auth/me").expect(401);
  });
});

describe("reset della password", () => {
  /** Chiede il link di reset e restituisce il token che sarebbe arrivato per email */
  async function requestResetToken(email: string): Promise<string> {
    await api().post("/api/auth/forgot-password").send({ email }).expect(200);
    // Il server risponde prima di inviare l'email: si aspetta che l'invio avvenga
    await vi.waitFor(() => expect(sendMail).toHaveBeenCalledOnce());
    const [to, link] = sendMail.mock.calls[0]!;
    expect(to).toBe(email);
    return new URL(link).hash.replace("#token=", "");
  }

  it("risponde allo stesso modo per un'email non registrata, senza inviare nulla", async () => {
    const res = await api().post("/api/auth/forgot-password").send({ email: uniqueEmail() }).expect(200);
    expect(res.body).toEqual({ status: "ok" });
    await new Promise((resolve) => setTimeout(resolve, 50));
    expect(sendMail).not.toHaveBeenCalled();
  });

  it("imposta la nuova password, chiude le sessioni aperte e il link vale una volta sola", async () => {
    const { agent, user } = await signedInAgent();
    const token = await requestResetToken(user.email);

    await api().post("/api/auth/reset-password").send({ token, newPassword: "nuova-password" }).expect(200);

    // La sessione aperta prima del reset non vale più
    await agent.get("/api/auth/me").expect(401);
    // La vecchia password non funziona, la nuova sì
    await api().post("/api/auth/login").send({ email: user.email, password: user.password }).expect(401);
    await api().post("/api/auth/login").send({ email: user.email, password: "nuova-password" }).expect(200);
    // Lo stesso link non si può riusare
    await api().post("/api/auth/reset-password").send({ token, newPassword: "altra-password" }).expect(400);
  });

  it("rifiuta un token inventato", async () => {
    const res = await api()
      .post("/api/auth/reset-password")
      .send({ token: "a".repeat(64), newPassword: "nuova-password" })
      .expect(400);
    expect(res.body.error).toBe("Il link non è valido o è scaduto");
  });
});
