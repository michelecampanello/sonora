import { randomUUID } from "node:crypto";
import type TestAgent from "supertest/lib/agent.js";
import { beforeAll, describe, expect, it } from "vitest";
import { pool } from "../../src/db.js";
import { api, createProduct, signedInAgent } from "../helpers.js";

let admin: TestAgent;
let categoryId: string;
let brandId: string;

beforeAll(async () => {
  ({ agent: admin } = await signedInAgent("admin"));
  const { rows } = await pool.query<{ category_id: string; brand_id: string }>(
    `SELECT (SELECT id FROM categories WHERE slug = 'bassi-elettrici') AS category_id,
            (SELECT id FROM brands ORDER BY slug LIMIT 1) AS brand_id`,
  );
  ({ category_id: categoryId, brand_id: brandId } = rows[0]!);
});

/** Un prodotto valido da inviare al form, con un codice articolo sempre diverso */
const input = (overrides: Record<string, unknown> = {}) => ({
  sku: `adm-${randomUUID().slice(0, 8)}`,
  name: "Basso Prova 5 Corde",
  description: "  Un basso per i test.  ",
  price: "899.5",
  stock: 4,
  category_id: categoryId,
  brand_id: brandId,
  specs: [
    { label: "Corde", value: "5" },
    { label: "Tasti", value: "24" },
  ],
  images: [
    { url: "/prodotti/basso.svg", alt: "Fronte" },
    { url: "https://cdn.example.com/retro.jpg", alt: "" },
  ],
  ...overrides,
});

describe("POST /api/admin/products", () => {
  it("crea il prodotto con caratteristiche e immagini, nell'ordine dato", async () => {
    const body = input();
    const res = await admin.post("/api/admin/products").send(body).expect(201);

    expect(res.body).toMatchObject({
      sku: body.sku.toUpperCase(),
      name: "Basso Prova 5 Corde",
      description: "Un basso per i test.",
      price: "899.50",
      stock: 4,
      active: true, // se non indicato, il prodotto è in vendita
      featured: false,
      category: "Bassi elettrici",
      specs: body.specs,
      images: [
        { url: "/prodotti/basso.svg", alt: "Fronte" },
        { url: "https://cdn.example.com/retro.jpg", alt: null },
      ],
    });
    // Lo slug lo genera il database dal nome
    expect(res.body.slug).toMatch(/^basso-prova-5-corde/);

    // Ed è subito visibile nel negozio, con la prima immagine come copertina
    const shop = await api().get(`/api/products/${res.body.slug}`).expect(200);
    expect(shop.body.image_url).toBe("/prodotti/basso.svg");
    expect(shop.body.specs).toEqual(body.specs);
  });

  it("caratteristiche e immagini sono facoltative", async () => {
    const res = await admin.post("/api/admin/products").send(input({ specs: undefined, images: undefined, description: "" })).expect(201);
    expect(res.body).toMatchObject({ specs: [], images: [], description: null });
  });

  it("rifiuta un codice articolo già usato, senza distinguere maiuscole e minuscole", async () => {
    const body = input();
    await admin.post("/api/admin/products").send(body).expect(201);
    const res = await admin.post("/api/admin/products").send(input({ sku: body.sku.toUpperCase() })).expect(409);
    expect(res.body.error).toBe("Esiste già un prodotto con questo codice articolo");
  });

  it("rifiuta una categoria o una marca inesistente", async () => {
    const res = await admin.post("/api/admin/products").send(input({ category_id: randomUUID() })).expect(400);
    expect(res.body.error).toBe("La categoria o la marca scelta non esiste");
    await admin.post("/api/admin/products").send(input({ brand_id: randomUUID() })).expect(400);
  });

  it("con una categoria inesistente non crea nulla", async () => {
    const body = input({ category_id: randomUUID() });
    await admin.post("/api/admin/products").send(body).expect(400);
    const { rowCount } = await pool.query("SELECT 1 FROM products WHERE sku = $1", [body.sku.toUpperCase()]);
    expect(rowCount).toBe(0);
  });

  it.each([
    [{ sku: "ab" }, /Codice articolo non valido/],
    [{ sku: "con spazi" }, /Codice articolo non valido/],
    [{ name: "X" }, /Nome non valido/],
    [{ description: "a".repeat(5001) }, /Descrizione troppo lunga/],
    [{ price: "gratis" }, /Prezzo non valido/],
    [{ stock: -2 }, /Quantità in magazzino non valida/],
    [{ active: "sì" }, /active o featured/],
    [{ category_id: "chitarre" }, /Scegli una categoria/],
    [{ brand_id: undefined }, /Scegli una marca/],
    [{ specs: [{ label: "Corde", value: "" }] }, /caratteristica/],
    [{ specs: Array.from({ length: 31 }, () => ({ label: "a", value: "b" })) }, /Al massimo 30/],
    [{ images: [{ url: "javascript:alert(1)" }] }, /immagine non valido/],
    [{ images: [{ url: "http://example.com/a.jpg" }] }, /immagine non valido/],
    [{ images: [{ url: "//example.com/a.jpg" }] }, /immagine non valido/],
    [{ images: [{ url: "data:image/png;base64,AAAA" }] }, /immagine non valido/],
    [{ images: Array.from({ length: 11 }, () => ({ url: "/a.svg" })) }, /Al massimo 10/],
  ])("rifiuta %j", async (overrides, error) => {
    const res = await admin.post("/api/admin/products").send(input(overrides)).expect(400);
    expect(res.body.error).toMatch(error);
  });
});

describe("GET e PUT /api/admin/products/:id", () => {
  it("restituisce il prodotto completo, anche se nascosto", async () => {
    const hidden = await createProduct({ active: false });
    const res = await admin.get(`/api/admin/products/${hidden.id}`).expect(200);
    expect(res.body).toMatchObject({ id: hidden.id, active: false, specs: [], images: [] });
    expect(res.body.category_id).toMatch(/^[0-9a-f-]{36}$/);
  });

  it("sostituisce tutti i dati, ma lo slug resta quello di prima", async () => {
    const created = await admin.post("/api/admin/products").send(input()).expect(201);
    const { id, slug, sku } = created.body;

    const res = await admin
      .put(`/api/admin/products/${id}`)
      .send(input({ sku, name: "Nome Completamente Nuovo", price: 799, specs: [{ label: "Corde", value: "6" }], images: [] }))
      .expect(200);

    expect(res.body).toMatchObject({ id, slug, name: "Nome Completamente Nuovo", price: "799.00", specs: [{ label: "Corde", value: "6" }], images: [] });
    // Il vecchio link funziona ancora e mostra i dati nuovi
    const shop = await api().get(`/api/products/${slug}`).expect(200);
    expect(shop.body.name).toBe("Nome Completamente Nuovo");
    expect(shop.body.image_url).toBeNull();
  });

  it("non permette di prendere il codice articolo di un altro prodotto", async () => {
    const first = await admin.post("/api/admin/products").send(input()).expect(201);
    const second = await admin.post("/api/admin/products").send(input()).expect(201);
    await admin.put(`/api/admin/products/${second.body.id}`).send(input({ sku: first.body.sku })).expect(409);
  });

  it("un errore di validazione non modifica nulla", async () => {
    const created = await admin.post("/api/admin/products").send(input()).expect(201);
    await admin.put(`/api/admin/products/${created.body.id}`).send(input({ sku: created.body.sku, images: [{ url: "ftp://x" }] })).expect(400);
    const after = await admin.get(`/api/admin/products/${created.body.id}`).expect(200);
    expect(after.body.images).toHaveLength(2);
  });

  it("risponde 404 per un prodotto inesistente", async () => {
    await admin.get(`/api/admin/products/${randomUUID()}`).expect(404);
    await admin.get("/api/admin/products/non-un-uuid").expect(404);
    await admin.put(`/api/admin/products/${randomUUID()}`).send(input()).expect(404);
  });

  it("le nuove rotte sono riservate agli admin", async () => {
    const { agent: customer } = await signedInAgent();
    await customer.post("/api/admin/products").send(input()).expect(403);
    await customer.put(`/api/admin/products/${randomUUID()}`).send(input()).expect(403);
    await api().post("/api/admin/products").send(input()).expect(401);
  });
});
