import { randomUUID } from "node:crypto";
import { describe, expect, it } from "vitest";
import { api, createProduct, customer, signedInAgent, stockOf } from "../helpers.js";

const order = (items: unknown, buyer: unknown = customer) => ({ customer: buyer, items });

describe("POST /api/orders", () => {
  it("crea un ordine da ospite, calcola il totale e scala il magazzino", async () => {
    const guitar = await createProduct({ price: "349.90", stock: 5 });
    const cable = await createProduct({ price: "0.10", stock: 10 });

    const res = await api()
      .post("/api/orders")
      .send(order([{ productId: guitar.id, quantity: 2 }, { productId: cable.id, quantity: 3 }]))
      .expect(201);

    // 2 × 349,90 + 3 × 0,10 = 700,10: con i decimali in virgola mobile verrebbe 700.0999…
    expect(res.body.total).toBe("700.10");
    expect(res.body.customer.province).toBe("MI");
    expect(await stockOf(guitar.id)).toBe(3);
    expect(await stockOf(cable.id)).toBe(7);
  });

  it("ignora i prezzi mandati dal client", async () => {
    const product = await createProduct({ price: "100.00" });
    const res = await api()
      .post("/api/orders")
      .send({ ...order([{ productId: product.id, quantity: 1, price: "0.01" }]), total: "0.01" })
      .expect(201);
    expect(res.body.total).toBe("100.00");
  });

  it("unisce le righe dello stesso prodotto, anche se l'UUID è in maiuscolo", async () => {
    const product = await createProduct({ stock: 5 });
    const res = await api()
      .post("/api/orders")
      .send(order([{ productId: product.id, quantity: 1 }, { productId: product.id.toUpperCase(), quantity: 2 }]))
      .expect(201);
    expect(res.body.items).toHaveLength(1);
    expect(res.body.items[0].quantity).toBe(3);
    expect(await stockOf(product.id)).toBe(2);
  });

  it("con la disponibilità insufficiente rifiuta tutto l'ordine e non tocca il magazzino", async () => {
    const available = await createProduct({ stock: 5 });
    const scarce = await createProduct({ stock: 1 });

    const res = await api()
      .post("/api/orders")
      .send(order([{ productId: available.id, quantity: 1 }, { productId: scarce.id, quantity: 2 }]))
      .expect(409);

    expect(res.body.error).toMatch(/Disponibilità insufficiente/);
    expect(await stockOf(available.id)).toBe(5);
    expect(await stockOf(scarce.id)).toBe(1);
  });

  it("rifiuta i prodotti nascosti o inesistenti", async () => {
    const hidden = await createProduct({ active: false });
    await api().post("/api/orders").send(order([{ productId: hidden.id, quantity: 1 }])).expect(409);
    await api().post("/api/orders").send(order([{ productId: randomUUID(), quantity: 1 }])).expect(409);
  });

  it("due ordini simultanei non possono vendere lo stesso ultimo pezzo", async () => {
    const lastOne = await createProduct({ stock: 1 });
    const buy = () => api().post("/api/orders").send(order([{ productId: lastOne.id, quantity: 1 }]));

    const results = await Promise.all([buy(), buy(), buy()]);

    expect(results.map((r) => r.status).sort()).toEqual([201, 409, 409]);
    expect(await stockOf(lastOne.id)).toBe(0);
  });

  describe("validazione", () => {
    it.each([
      ["carrello vuoto", order([]), "Il carrello è vuoto"],
      ["carrello mancante", { customer }, "Il carrello è vuoto"],
      ["UUID non valido", order([{ productId: "abc", quantity: 1 }]), "Articolo non valido"],
      ["quantità zero", order([{ productId: randomUUID(), quantity: 0 }]), "Quantità non valida"],
      ["quantità decimale", order([{ productId: randomUUID(), quantity: 1.5 }]), "Quantità non valida"],
      ["quantità come testo", order([{ productId: randomUUID(), quantity: "2" }]), "Quantità non valida"],
      ["più di 99 pezzi", order([{ productId: randomUUID(), quantity: 100 }]), "Quantità non valida"],
      [
        "99 pezzi divisi su due righe dello stesso prodotto",
        order([{ productId: "0b4f9c1e-7a8d-4b5e-9f3a-2c1d0e9f8a7b", quantity: 50 }, { productId: "0b4f9c1e-7a8d-4b5e-9f3a-2c1d0e9f8a7b", quantity: 50 }]),
        "Quantità non valida",
      ],
      ["cliente mancante", { items: [{ productId: randomUUID(), quantity: 1 }] }, "Dati del cliente mancanti"],
      ["email non valida", order([{ productId: randomUUID(), quantity: 1 }], { ...customer, email: "x" }), "Email non valida"],
      ["CAP non valido", order([{ productId: randomUUID(), quantity: 1 }], { ...customer, postal_code: "123" }), "Il CAP deve avere 5 cifre"],
    ])("%s → 400", async (_case, body, error) => {
      const res = await api().post("/api/orders").send(body).expect(400);
      expect(res.body.error).toBe(error);
    });

    it("rifiuta più di 50 righe", async () => {
      const items = Array.from({ length: 51 }, () => ({ productId: randomUUID(), quantity: 1 }));
      const res = await api().post("/api/orders").send(order(items)).expect(400);
      expect(res.body.error).toBe("Troppi articoli nel carrello");
    });
  });
});

describe("ordini nell'area personale", () => {
  it("l'ordine di un utente collegato compare tra i suoi ordini", async () => {
    const { agent } = await signedInAgent();
    const product = await createProduct({ price: "25.00" });
    const created = await agent.post("/api/orders").send(order([{ productId: product.id, quantity: 2 }])).expect(201);

    const list = await agent.get("/api/account/orders").expect(200);
    expect(list.body).toMatchObject({ total: 1, page: 1, pages: 1 });
    expect(list.body.items[0]).toMatchObject({ id: created.body.id, total: "50.00", item_count: 2, status: "pending" });

    const detail = await agent.get(`/api/account/orders/${created.body.id}`).expect(200);
    expect(detail.body.items).toEqual([expect.objectContaining({ product_id: product.id, quantity: 2, unit_price: "25.00" })]);
  });

  it("un utente non può vedere l'ordine di un altro", async () => {
    const owner = await signedInAgent();
    const other = await signedInAgent();
    const product = await createProduct();
    const created = await owner.agent.post("/api/orders").send(order([{ productId: product.id, quantity: 1 }])).expect(201);

    const res = await other.agent.get(`/api/account/orders/${created.body.id}`).expect(404);
    expect(res.body.error).toBe("Ordine non trovato");
    const list = await other.agent.get("/api/account/orders").expect(200);
    expect(list.body.total).toBe(0);
  });

  it("gli ordini da ospite non sono collegati a nessun account", async () => {
    const { agent } = await signedInAgent();
    const product = await createProduct();
    const guestOrder = await api().post("/api/orders").send(order([{ productId: product.id, quantity: 1 }])).expect(201);
    await agent.get(`/api/account/orders/${guestOrder.body.id}`).expect(404);
  });

  it("senza sessione risponde 401", async () => {
    await api().get("/api/account/orders").expect(401);
  });
});
