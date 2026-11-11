import { describe, expect, it } from "vitest";
import { pool } from "../../src/db.js";
import { api, createUser, newAgent, signedInAgent, uniqueEmail } from "../helpers.js";

const address = (name = "Mario Rossi") => ({
  name,
  address: "Via Roma 1",
  city: "Milano",
  postal_code: "20100",
  province: "mi",
});

const card = (overrides: Record<string, unknown> = {}) => ({
  brand: "visa",
  last4: "4242",
  holder: "Mario Rossi",
  exp_month: 12,
  exp_year: new Date().getFullYear() + 2,
  ...overrides,
});

interface Saved {
  id: string;
  name?: string;
  is_default: boolean;
}

const defaultOf = (list: Saved[]) => list.filter((item) => item.is_default);

describe("rotte riservate", () => {
  it.each([
    ["get", "/api/account/addresses"],
    ["get", "/api/account/payment-methods"],
    ["patch", "/api/account/profile"],
    ["put", "/api/account/password"],
  ] as const)("%s %s risponde 401 senza sessione", async (method, path) => {
    await api()[method](path).expect(401);
  });
});

describe("profilo", () => {
  it("cambia il nome senza chiedere la password", async () => {
    const { agent, user } = await signedInAgent();
    const res = await agent.patch("/api/account/profile").send({ name: "Nuovo Nome", email: user.email }).expect(200);
    expect(res.body.user.name).toBe("Nuovo Nome");
  });

  it("per cambiare email serve la password attuale", async () => {
    const { agent, user } = await signedInAgent();
    const email = uniqueEmail();

    await agent.patch("/api/account/profile").send({ name: "Mario", email, currentPassword: "sbagliata" }).expect(400);
    const res = await agent
      .patch("/api/account/profile")
      .send({ name: "Mario", email, currentPassword: user.password })
      .expect(200);
    expect(res.body.user.email).toBe(email);
  });

  it("non permette di prendere l'email di un altro account", async () => {
    const { agent, user } = await signedInAgent();
    const other = await createUser();
    await agent
      .patch("/api/account/profile")
      .send({ name: "Mario", email: other.email, currentPassword: user.password })
      .expect(409);
  });
});

describe("cambio password", () => {
  it("chiude le altre sessioni ma lascia aperta quella corrente", async () => {
    const { agent, user } = await signedInAgent();
    const otherDevice = newAgent();
    await otherDevice.post("/api/auth/login").send({ email: user.email, password: user.password }).expect(200);

    await agent
      .put("/api/account/password")
      .send({ currentPassword: user.password, newPassword: "nuova-password" })
      .expect(200);

    await agent.get("/api/auth/me").expect(200);
    await otherDevice.get("/api/auth/me").expect(401);
  });

  it("rifiuta una password attuale sbagliata", async () => {
    const { agent } = await signedInAgent();
    const res = await agent
      .put("/api/account/password")
      .send({ currentPassword: "sbagliata", newPassword: "nuova-password" })
      .expect(400);
    expect(res.body.error).toBe("La password attuale non è corretta");
  });
});

describe("indirizzi", () => {
  it("il primo indirizzo diventa il predefinito, i successivi no", async () => {
    const { agent } = await signedInAgent();
    await agent.post("/api/account/addresses").send(address("Primo")).expect(201);
    const res = await agent.post("/api/account/addresses").send(address("Secondo")).expect(201);

    expect(res.body).toHaveLength(2);
    expect(defaultOf(res.body).map((a: Saved) => a.name)).toEqual(["Primo"]);
  });

  it("c'è sempre un solo predefinito", async () => {
    const { agent } = await signedInAgent();
    await agent.post("/api/account/addresses").send(address("Primo")).expect(201);
    const list = await agent.post("/api/account/addresses").send(address("Secondo")).expect(201);
    const second = list.body.find((a: Saved) => a.name === "Secondo");

    const res = await agent.post(`/api/account/addresses/${second.id}/default`).expect(200);
    expect(defaultOf(res.body).map((a: Saved) => a.name)).toEqual(["Secondo"]);
  });

  it("eliminando il predefinito, il suo posto passa a un altro indirizzo", async () => {
    const { agent } = await signedInAgent();
    const first = await agent.post("/api/account/addresses").send(address("Primo")).expect(201);
    await agent.post("/api/account/addresses").send(address("Secondo")).expect(201);

    const res = await agent.delete(`/api/account/addresses/${first.body[0].id}`).expect(200);
    expect(res.body).toHaveLength(1);
    expect(res.body[0]).toMatchObject({ name: "Secondo", is_default: true });
  });

  it("modifica un indirizzo e valida i campi", async () => {
    const { agent } = await signedInAgent();
    const created = await agent.post("/api/account/addresses").send(address()).expect(201);
    const id = created.body[0].id;

    const res = await agent.put(`/api/account/addresses/${id}`).send({ ...address(), city: "Torino" }).expect(200);
    expect(res.body[0].city).toBe("Torino");
    await agent.put(`/api/account/addresses/${id}`).send({ ...address(), postal_code: "1" }).expect(400);
  });

  it("non si possono toccare gli indirizzi di un altro utente", async () => {
    const owner = await signedInAgent();
    const intruder = await signedInAgent();
    const created = await owner.agent.post("/api/account/addresses").send(address()).expect(201);
    const id = created.body[0].id;

    await intruder.agent.put(`/api/account/addresses/${id}`).send(address("Intruso")).expect(404);
    await intruder.agent.post(`/api/account/addresses/${id}/default`).expect(404);
    await intruder.agent.delete(`/api/account/addresses/${id}`).expect(404);

    const stillThere = await owner.agent.get("/api/account/addresses").expect(200);
    expect(stillThere.body[0].name).toBe("Mario Rossi");
  });

  it("al massimo 10 indirizzi per utente, anche con richieste simultanee", async () => {
    const { agent } = await signedInAgent();
    const results = await Promise.all(
      Array.from({ length: 12 }, (_, i) => agent.post("/api/account/addresses").send(address(`Indirizzo ${i}`))),
    );

    expect(results.filter((r) => r.status === 201)).toHaveLength(10);
    expect(results.filter((r) => r.status === 409)).toHaveLength(2);
    const list = await agent.get("/api/account/addresses").expect(200);
    expect(list.body).toHaveLength(10);
    expect(defaultOf(list.body)).toHaveLength(1);
  });
});

describe("metodi di pagamento", () => {
  it("salva solo i campi previsti, mai il numero completo della carta", async () => {
    const { agent, user } = await signedInAgent();
    const res = await agent
      .post("/api/account/payment-methods")
      .send(card({ number: "4242424242424242", cvv: "123" }))
      .expect(201);

    expect(res.body[0]).toMatchObject({ brand: "visa", last4: "4242", is_default: true });
    expect(JSON.stringify(res.body)).not.toContain("4242424242424242");

    const { rows } = await pool.query("SELECT * FROM payment_methods WHERE user_id = $1", [user.id]);
    expect(rows).toHaveLength(1);
    expect(Object.keys(rows[0]).sort()).toEqual(
      ["brand", "created_at", "exp_month", "exp_year", "holder", "id", "is_default", "last4", "user_id"],
    );
  });

  it.each([
    [card({ brand: "diners" }), "Circuito non valido"],
    [card({ last4: "42" }), "Inserisci le ultime 4 cifre della carta"],
    [card({ exp_month: 13 }), "Mese di scadenza non valido"],
    [card({ exp_year: new Date().getFullYear() - 1 }), "La carta è scaduta"],
    [card({ exp_year: new Date().getFullYear() + 21 }), "Anno di scadenza non valido"],
  ])("rifiuta %j", async (body, error) => {
    const { agent } = await signedInAgent();
    const res = await agent.post("/api/account/payment-methods").send(body).expect(400);
    expect(res.body.error).toBe(error);
  });

  it("elimina un metodo di pagamento", async () => {
    const { agent } = await signedInAgent();
    const created = await agent.post("/api/account/payment-methods").send(card()).expect(201);
    const res = await agent.delete(`/api/account/payment-methods/${created.body[0].id}`).expect(200);
    expect(res.body).toEqual([]);
  });
});
