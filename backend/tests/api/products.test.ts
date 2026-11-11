import { describe, expect, it } from "vitest";
import { api, createProduct } from "../helpers.js";

interface Summary {
  id: string;
  slug: string;
  name: string;
  price: string;
  stock: number;
  brand_slug: string;
  category_slug: string;
}

const prices = (items: Summary[]) => items.map((p) => Number(p.price));

describe("GET /api/products", () => {
  it("restituisce una pagina del catalogo con i dati di paginazione", async () => {
    const res = await api().get("/api/products?limit=5").expect(200);
    expect(res.body.items).toHaveLength(5);
    expect(res.body).toMatchObject({ page: 1, pages: Math.ceil(res.body.total / 5) });
  });

  it("limita la dimensione della pagina a 50", async () => {
    const res = await api().get("/api/products?limit=1000").expect(200);
    expect(res.body.items.length).toBeLessThanOrEqual(50);
  });

  it("ordina per prezzo crescente e decrescente", async () => {
    const asc = await api().get("/api/products?sort=price_asc&limit=50").expect(200);
    const desc = await api().get("/api/products?sort=price_desc&limit=50").expect(200);
    expect(prices(asc.body.items)).toEqual([...prices(asc.body.items)].sort((a, b) => a - b));
    expect(prices(desc.body.items)).toEqual([...prices(desc.body.items)].sort((a, b) => b - a));
  });

  it("ignora un ordinamento non previsto invece di rispondere con un errore", async () => {
    await api().get("/api/products?sort=toString").expect(200);
  });

  it("filtra per fascia di prezzo", async () => {
    const res = await api().get("/api/products?minPrice=100&maxPrice=400&limit=50").expect(200);
    expect(res.body.items.length).toBeGreaterThan(0);
    for (const price of prices(res.body.items)) {
      expect(price).toBeGreaterThanOrEqual(100);
      expect(price).toBeLessThanOrEqual(400);
    }
  });

  it("una categoria principale include i prodotti delle sottocategorie", async () => {
    const res = await api().get("/api/products?category=chitarre&limit=50").expect(200);
    const categories = new Set(res.body.items.map((p: Summary) => p.category_slug));
    expect(categories.has("chitarre-elettriche")).toBe(true);
    expect(categories.has("bassi-elettrici")).toBe(false);
  });

  it("filtra per una o più marche", async () => {
    const res = await api().get("/api/products?brand=nordwood&limit=50").expect(200);
    expect(res.body.items.length).toBeGreaterThan(0);
    expect(res.body.items.every((p: Summary) => p.brand_slug === "nordwood")).toBe(true);
  });

  it("mostra solo i prodotti disponibili con inStock=true", async () => {
    const soldOut = await createProduct({ stock: 0 });
    const res = await api().get("/api/products?inStock=true&limit=50&sort=newest").expect(200);
    expect(res.body.items.every((p: Summary) => p.stock > 0)).toBe(true);
    expect(res.body.items.some((p: Summary) => p.id === soldOut.id)).toBe(false);
  });

  it("trova i prodotti anche con un errore di battitura", async () => {
    const res = await api().get("/api/products?q=humbuker").expect(200);
    expect(res.body.total).toBeGreaterThan(0);
  });

  it("con ids restituisce solo i prodotti richiesti", async () => {
    const a = await createProduct();
    const b = await createProduct();
    const res = await api().get(`/api/products?ids=${a.id},${b.id}`).expect(200);
    expect(res.body.items.map((p: Summary) => p.id).sort()).toEqual([a.id, b.id].sort());
  });

  it("con ids non validi restituisce una lista vuota, non tutto il catalogo", async () => {
    const res = await api().get("/api/products?ids=non-valido").expect(200);
    expect(res.body.items).toEqual([]);
  });

  it("non mostra i prodotti nascosti", async () => {
    const hidden = await createProduct({ active: false });
    const res = await api().get(`/api/products?ids=${hidden.id}`).expect(200);
    expect(res.body.items).toEqual([]);
  });
});

describe("GET /api/products/:slug", () => {
  it("restituisce il dettaglio di un prodotto", async () => {
    const product = await createProduct({ price: "123.45" });
    const res = await api().get(`/api/products/${product.slug}`).expect(200);
    expect(res.body).toMatchObject({ id: product.id, price: "123.45" });
  });

  it("risponde 404 per un prodotto inesistente o uno slug malformato", async () => {
    await api().get("/api/products/non-esiste").expect(404);
    await api().get("/api/products/Slug%20Malformato").expect(404);
  });

  it("risponde 404 per un prodotto nascosto", async () => {
    const hidden = await createProduct({ active: false });
    await api().get(`/api/products/${hidden.slug}`).expect(404);
  });
});

describe("categorie e marche", () => {
  it("GET /api/categories restituisce le categorie", async () => {
    const res = await api().get("/api/categories").expect(200);
    expect(res.body.length).toBeGreaterThan(0);
  });

  it("GET /api/brands restituisce le marche", async () => {
    const res = await api().get("/api/brands").expect(200);
    expect(res.body.length).toBeGreaterThan(0);
  });

  it("un indirizzo inesistente risponde 404 in JSON", async () => {
    const res = await api().get("/api/non-esiste").expect(404);
    expect(res.body).toEqual({ error: "Risorsa non trovata" });
  });
});
