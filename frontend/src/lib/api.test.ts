import { describe, expect, it, vi } from "vitest";
import { ApiError, fetchJson, productsPath, sendJson } from "@/lib/api";
import { mockApi } from "@/test/mockApi";

describe("productsPath", () => {
  it("include solo i filtri impostati", () => {
    const path = productsPath({ brands: [], inStock: false, sort: "newest", page: 1 });
    expect(path).toBe("/api/products?sort=newest&page=1&limit=12");
  });

  it("codifica tutti i filtri nella query string", () => {
    const url = new URL(
      productsPath({
        q: "basso 5 corde",
        category: "bassi",
        brands: ["nordwood", "pulse-audio"],
        minPrice: "100",
        maxPrice: "500",
        inStock: true,
        sort: "price_asc",
        page: 3,
      }),
      "http://localhost",
    );
    expect(Object.fromEntries(url.searchParams)).toEqual({
      q: "basso 5 corde",
      category: "bassi",
      brand: "nordwood,pulse-audio",
      minPrice: "100",
      maxPrice: "500",
      inStock: "true",
      sort: "price_asc",
      page: "3",
      limit: "12",
    });
  });
});

describe("fetchJson e sendJson", () => {
  it("restituiscono il JSON della risposta e inviano il cookie di sessione", async () => {
    const fetchMock = mockApi({ "GET /api/brands": { body: [{ slug: "nordwood" }] } });
    await expect(fetchJson("/api/brands")).resolves.toEqual([{ slug: "nordwood" }]);
    expect(fetchMock.mock.calls[0]?.[1]).toMatchObject({ credentials: "include" });
  });

  it("in caso di errore lanciano un ApiError con il messaggio del server", async () => {
    mockApi({ "POST /api/orders": { status: 409, body: { error: "Disponibilità insufficiente" } } });
    const error = await sendJson("POST", "/api/orders", {}).catch((err: unknown) => err);
    expect(error).toBeInstanceOf(ApiError);
    expect(error).toMatchObject({ status: 409, message: "Disponibilità insufficiente" });
  });

  it("se la risposta d'errore non è JSON usano un messaggio generico", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response("<html>Bad gateway</html>", { status: 502 })));
    await expect(fetchJson("/api/products")).rejects.toMatchObject({ status: 502, message: "Errore 502" });
  });
});
