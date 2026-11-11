import { randomUUID } from "node:crypto";
import type TestAgent from "supertest/lib/agent.js";
import { beforeAll, describe, expect, it } from "vitest";
import { api, createProduct, customer, signedInAgent, stockOf } from "../helpers.js";

let admin: TestAgent;
beforeAll(async () => {
  ({ agent: admin } = await signedInAgent("admin"));
});

/** Un ordine da ospite appena creato, con il prodotto ordinato */
async function placeOrder(quantity = 2, stock = 10) {
  const product = await createProduct({ price: "40.00", stock });
  const res = await api()
    .post("/api/orders")
    .send({ customer, items: [{ productId: product.id, quantity }] })
    .expect(201);
  return { orderId: res.body.id as string, product };
}

const setStatus = (orderId: string, status: unknown) => admin.patch(`/api/admin/orders/${orderId}/status`).send({ status });

describe("accesso al pannello", () => {
  const routes = [
    ["get", "/api/admin/stats"],
    ["get", "/api/admin/orders"],
    ["get", `/api/admin/orders/${randomUUID()}`],
    ["patch", `/api/admin/orders/${randomUUID()}/status`],
    ["get", "/api/admin/products"],
    ["patch", `/api/admin/products/${randomUUID()}`],
  ] as const;

  it.each(routes)("%s %s risponde 401 senza sessione", async (method, path) => {
    await api()[method](path).expect(401);
  });

  it.each(routes)("%s %s risponde 403 a un cliente", async (method, path) => {
    const { agent } = await signedInAgent();
    const res = await agent[method](path).send({ status: "shipped", stock: 0 }).expect(403);
    expect(res.body.error).toBe("Accesso riservato agli amministratori");
  });

  it("un cliente non può cambiare lo stato nemmeno del proprio ordine", async () => {
    const { agent } = await signedInAgent();
    const product = await createProduct();
    const order = await agent.post("/api/orders").send({ customer, items: [{ productId: product.id, quantity: 1 }] }).expect(201);
    await agent.patch(`/api/admin/orders/${order.body.id}/status`).send({ status: "cancelled" }).expect(403);
  });
});

describe("ordini", () => {
  it("elenca gli ordini di tutti, con chi li ha fatti", async () => {
    const { orderId } = await placeOrder();
    const res = await admin.get("/api/admin/orders").expect(200);
    expect(res.body.items[0]).toMatchObject({
      id: orderId,
      status: "pending",
      customer_name: customer.name,
      customer_email: customer.email,
      user_id: null,
      item_count: 2,
    });
  });

  it("filtra per stato e ignora uno stato inesistente", async () => {
    const { orderId } = await placeOrder();
    await setStatus(orderId, "shipped").expect(200);

    const shipped = await admin.get("/api/admin/orders?status=shipped").expect(200);
    expect(shipped.body.items.every((o: { status: string }) => o.status === "shipped")).toBe(true);
    expect(shipped.body.items.some((o: { id: string }) => o.id === orderId)).toBe(true);

    const all = await admin.get("/api/admin/orders?status=inventato").expect(200);
    expect(all.body.total).toBeGreaterThan(shipped.body.total);
  });

  it("mostra il dettaglio di qualsiasi ordine, con gli stati possibili", async () => {
    const { orderId, product } = await placeOrder();
    const res = await admin.get(`/api/admin/orders/${orderId}`).expect(200);
    expect(res.body).toMatchObject({ id: orderId, status: "pending", next_statuses: ["shipped", "cancelled"] });
    expect(res.body.items).toEqual([expect.objectContaining({ product_id: product.id, quantity: 2 })]);
  });

  it("segue il percorso in lavorazione → spedito → pagato", async () => {
    const { orderId } = await placeOrder();
    const shipped = await setStatus(orderId, "shipped").expect(200);
    expect(shipped.body).toMatchObject({ status: "shipped", next_statuses: ["paid", "cancelled"] });
    expect((await setStatus(orderId, "paid").expect(200)).body.status).toBe("paid");

    const detail = await admin.get(`/api/admin/orders/${orderId}`).expect(200);
    expect(detail.body.next_statuses).toEqual([]);
  });

  it.each([
    ["pending", "paid", "non si incassa prima della consegna"],
    ["paid", "cancelled", "un ordine pagato è definitivo"],
    ["cancelled", "pending", "un ordine annullato non si riapre"],
    ["shipped", "pending", "non si torna indietro"],
  ] as const)("rifiuta %s → %s: %s", async (from, to, _reason) => {
    const { orderId } = await placeOrder();
    const path: Record<string, string[]> = {
      pending: [],
      shipped: ["shipped"],
      paid: ["shipped", "paid"],
      cancelled: ["cancelled"],
    };
    for (const step of path[from]!) await setStatus(orderId, step).expect(200);

    const res = await setStatus(orderId, to).expect(409);
    expect(res.body.error).toContain(`"${from}"`);
  });

  it("annullando un ordine i pezzi tornano in magazzino, una volta sola", async () => {
    const { orderId, product } = await placeOrder(3, 10);
    expect(await stockOf(product.id)).toBe(7);

    // Due annullamenti simultanei: uno riesce, l'altro trova l'ordine già annullato
    const results = await Promise.all([setStatus(orderId, "cancelled"), setStatus(orderId, "cancelled")]);
    expect(results.map((r) => r.status).sort()).toEqual([200, 409]);
    expect(await stockOf(product.id)).toBe(10);
  });

  it("rimette in magazzino anche un ordine annullato dopo la spedizione", async () => {
    const { orderId, product } = await placeOrder(1, 4);
    await setStatus(orderId, "shipped").expect(200);
    await setStatus(orderId, "cancelled").expect(200);
    expect(await stockOf(product.id)).toBe(4);
  });

  it("valida stato e ordine", async () => {
    const { orderId } = await placeOrder();
    expect((await setStatus(orderId, "consegnato").expect(400)).body.error).toBe("Stato non valido");
    await setStatus(randomUUID(), "shipped").expect(404);
    await admin.patch("/api/admin/orders/non-un-uuid/status").send({ status: "shipped" }).expect(404);
    await admin.get(`/api/admin/orders/${randomUUID()}`).expect(404);
  });
});

describe("prodotti", () => {
  it("elenca anche i prodotti nascosti e cerca per nome o codice", async () => {
    const hidden = await createProduct({ active: false });
    const res = await admin.get(`/api/admin/products?q=${hidden.slug.split("-").pop()}`).expect(200);
    expect(res.body.items).toEqual([expect.objectContaining({ id: hidden.id, active: false })]);
  });

  it("con lowStock=true mostra solo i prodotti in vendita quasi esauriti", async () => {
    const res = await admin.get("/api/admin/products?lowStock=true").expect(200);
    expect(res.body.total).toBeGreaterThan(0);
    for (const product of res.body.items) {
      expect(product.active).toBe(true);
      expect(product.stock).toBeLessThanOrEqual(5);
    }
  });

  it("modifica solo i campi indicati", async () => {
    const product = await createProduct({ price: "10.00", stock: 5 });
    const res = await admin.patch(`/api/admin/products/${product.id}`).send({ stock: 42, featured: true }).expect(200);
    expect(res.body).toMatchObject({ id: product.id, price: "10.00", stock: 42, featured: true, active: true });
  });

  it("accetta il prezzo come numero o come testo e lo salva con due decimali", async () => {
    const product = await createProduct();
    expect((await admin.patch(`/api/admin/products/${product.id}`).send({ price: 19.9 }).expect(200)).body.price).toBe("19.90");
    expect((await admin.patch(`/api/admin/products/${product.id}`).send({ price: "1290" }).expect(200)).body.price).toBe("1290.00");
  });

  it("nascondendo un prodotto sparisce dal negozio", async () => {
    const product = await createProduct();
    await admin.patch(`/api/admin/products/${product.id}`).send({ active: false }).expect(200);
    await api().get(`/api/products/${product.slug}`).expect(404);
  });

  it.each([
    [{ price: -1 }, "Prezzo non valido"],
    [{ price: "12,50" }, "Prezzo non valido"],
    [{ price: "1.999" }, "Prezzo non valido"],
    [{ price: 1e9 }, "Prezzo non valido"],
    [{ stock: -1 }, "Quantità in magazzino non valida"],
    [{ stock: 2.5 }, "Quantità in magazzino non valida"],
    [{ stock: "10" }, "Quantità in magazzino non valida"],
    [{ active: "false" }, "Valore non valido per active"],
    [{}, "Nessuna modifica indicata"],
    [{ name: "Nuovo nome", sku: "X" }, "Nessuna modifica indicata"],
  ])("rifiuta %j", async (body, error) => {
    const product = await createProduct();
    const res = await admin.patch(`/api/admin/products/${product.id}`).send(body).expect(400);
    expect(res.body.error).toBe(error);
  });

  it("risponde 404 per un prodotto inesistente", async () => {
    await admin.patch(`/api/admin/products/${randomUUID()}`).send({ stock: 1 }).expect(404);
  });
});

describe("statistiche", () => {
  it("contano gli ordini per stato e incassano solo quelli pagati", async () => {
    const before = (await admin.get("/api/admin/stats").expect(200)).body;

    const paid = await placeOrder(2); // 2 × 40 € = 80 €
    await setStatus(paid.orderId, "shipped").expect(200);
    await setStatus(paid.orderId, "paid").expect(200);
    await placeOrder(1); // resta in lavorazione: non è ancora incassato

    const after = (await admin.get("/api/admin/stats").expect(200)).body;
    expect(after.orders.paid - before.orders.paid).toBe(1);
    expect(after.orders.pending - before.orders.pending).toBe(1);
    expect(Number(after.revenue) - Number(before.revenue)).toBeCloseTo(80, 2);
    expect(after.activeProducts - before.activeProducts).toBe(2);
  });
});
