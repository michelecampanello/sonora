import { describe, expect, it } from "vitest";
import { pool } from "../../src/db.js";
import { api, createProduct, customer, signedInAgent } from "../helpers.js";

const reviewsOf = (slug: string) => `/api/products/${slug}/reviews`;
const mine = (slug: string) => `${reviewsOf(slug)}/mine`;

describe("recensioni", () => {
  it("un prodotto senza recensioni ha riepilogo vuoto, anche nel catalogo", async () => {
    const product = await createProduct();
    const res = await api().get(reviewsOf(product.slug)).expect(200);
    expect(res.body).toMatchObject({ items: [], total: 0, mine: null, summary: { average: null, count: 0, distribution: [0, 0, 0, 0, 0] } });

    const detail = await api().get(`/api/products/${product.slug}`).expect(200);
    expect(detail.body).toMatchObject({ rating: null, review_count: 0 });
  });

  it("chi ha fatto l'accesso scrive una recensione, mostrata con nome e iniziale del cognome", async () => {
    const product = await createProduct();
    const { agent } = await signedInAgent();

    const saved = await agent.put(mine(product.slug)).send({ rating: 4, comment: "  Suona benissimo.  " }).expect(200);
    expect(saved.body).toMatchObject({ rating: 4, comment: "Suona benissimo.", author: "Utente d.", verified: false });

    const res = await agent.get(reviewsOf(product.slug)).expect(200);
    expect(res.body.items).toHaveLength(1);
    expect(res.body.mine).toMatchObject({ id: saved.body.id, rating: 4 });
    expect(JSON.stringify(res.body)).not.toContain("di Prova"); // il cognome intero non esce mai

    // Chi non ha fatto l'accesso la vede, ma "mine" è vuoto
    const anonymous = await api().get(reviewsOf(product.slug)).expect(200);
    expect(anonymous.body.items).toHaveLength(1);
    expect(anonymous.body.mine).toBeNull();
  });

  it("una sola recensione per persona: scriverla di nuovo la modifica", async () => {
    const product = await createProduct();
    const { agent } = await signedInAgent();

    const first = await agent.put(mine(product.slug)).send({ rating: 2, comment: "Così così" }).expect(200);
    const second = await agent.put(mine(product.slug)).send({ rating: 5 }).expect(200);

    expect(second.body).toMatchObject({ id: first.body.id, rating: 5, comment: "" });
    const res = await api().get(reviewsOf(product.slug)).expect(200);
    expect(res.body.total).toBe(1);
  });

  it("calcola media e distribuzione dei voti, anche nel catalogo", async () => {
    const product = await createProduct();
    for (const rating of [5, 4, 4]) {
      const { agent } = await signedInAgent();
      await agent.put(mine(product.slug)).send({ rating }).expect(200);
    }

    const res = await api().get(reviewsOf(product.slug)).expect(200);
    expect(res.body.summary).toEqual({ average: 4.3, count: 3, distribution: [0, 0, 0, 2, 1] });

    const list = await api().get(`/api/products?ids=${product.id}`).expect(200);
    expect(list.body.items[0]).toMatchObject({ rating: 4.3, review_count: 3 });
  });

  it("segna come verificato chi ha comprato il prodotto in un ordine non annullato", async () => {
    const product = await createProduct();
    const { agent, user } = await signedInAgent();
    await agent.post("/api/orders").send({ customer, items: [{ productId: product.id, quantity: 1 }] }).expect(201);

    const saved = await agent.put(mine(product.slug)).send({ rating: 5 }).expect(200);
    expect(saved.body.verified).toBe(true);

    await pool.query("UPDATE orders SET status = 'cancelled' WHERE user_id = $1", [user.id]);
    const res = await agent.get(reviewsOf(product.slug)).expect(200);
    expect(res.body.mine.verified).toBe(false);
  });

  it.each([
    [{}, "Scegli un voto da 1 a 5 stelle"],
    [{ rating: 0 }, "Scegli un voto da 1 a 5 stelle"],
    [{ rating: 6 }, "Scegli un voto da 1 a 5 stelle"],
    [{ rating: 3.5 }, "Scegli un voto da 1 a 5 stelle"],
    [{ rating: "5" }, "Scegli un voto da 1 a 5 stelle"],
    [{ rating: 3, comment: "x".repeat(2001) }, "Il commento può avere al massimo 2000 caratteri"],
  ])("rifiuta %j", async (body, error) => {
    const product = await createProduct();
    const { agent } = await signedInAgent();
    const res = await agent.put(mine(product.slug)).send(body).expect(400);
    expect(res.body.error).toBe(error);
  });

  it("per scrivere serve l'accesso", async () => {
    const product = await createProduct();
    await api().put(mine(product.slug)).send({ rating: 5 }).expect(401);
    await api().delete(mine(product.slug)).expect(401);
  });

  it("i prodotti nascosti o inesistenti non si recensiscono né mostrano recensioni", async () => {
    const hidden = await createProduct({ active: false });
    const { agent } = await signedInAgent();
    await agent.put(mine(hidden.slug)).send({ rating: 5 }).expect(404);
    await api().get(reviewsOf(hidden.slug)).expect(404);
    await api().get(reviewsOf("non-esiste")).expect(404);
  });

  it("ognuno cancella solo la propria recensione", async () => {
    const product = await createProduct();
    const author = await signedInAgent();
    const other = await signedInAgent();
    await author.agent.put(mine(product.slug)).send({ rating: 1 }).expect(200);

    await other.agent.delete(mine(product.slug)).expect(404);
    expect((await api().get(reviewsOf(product.slug))).body.total).toBe(1);

    await author.agent.delete(mine(product.slug)).expect(200);
    expect((await api().get(reviewsOf(product.slug))).body.total).toBe(0);
  });

  it("l'admin può cancellare qualsiasi recensione, un cliente no", async () => {
    const product = await createProduct();
    const author = await signedInAgent();
    const saved = await author.agent.put(mine(product.slug)).send({ rating: 1, comment: "Spam" }).expect(200);

    await author.agent.delete(`/api/admin/reviews/${saved.body.id}`).expect(403);
    const { agent: admin } = await signedInAgent("admin");
    await admin.delete(`/api/admin/reviews/${saved.body.id}`).expect(200);
    await admin.delete(`/api/admin/reviews/${saved.body.id}`).expect(404);
    expect((await api().get(reviewsOf(product.slug))).body.total).toBe(0);
  });

  it("pagina le recensioni, dalla più recente", async () => {
    const product = await createProduct();
    for (let i = 0; i < 11; i++) {
      const { agent } = await signedInAgent();
      await agent.put(mine(product.slug)).send({ rating: 3, comment: `Recensione ${i}` }).expect(200);
    }
    const first = await api().get(reviewsOf(product.slug)).expect(200);
    expect(first.body).toMatchObject({ total: 11, pages: 2, page: 1 });
    expect(first.body.items).toHaveLength(10);
    expect(first.body.items[0].comment).toBe("Recensione 10");

    const second = await api().get(`${reviewsOf(product.slug)}?page=2`).expect(200);
    expect(second.body.items.map((r: { comment: string }) => r.comment)).toEqual(["Recensione 0"]);
  });
});
