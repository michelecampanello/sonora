import { describe, expect, it } from "vitest";
import { filtersFromParams, filtersToParams } from "@/hooks/useCatalogFilters";

const parse = (query: string) => filtersFromParams(new URLSearchParams(query));

describe("filtersFromParams", () => {
  it("senza parametri usa i valori predefiniti", () => {
    expect(parse("")).toEqual({
      q: undefined,
      category: undefined,
      brands: [],
      minPrice: undefined,
      maxPrice: undefined,
      inStock: false,
      sort: "newest",
      page: 1,
    });
  });

  it("legge i filtri dall'URL", () => {
    expect(parse("q=fender&category=chitarre&brand=nordwood,pulse-audio&inStock=true&sort=price_desc&page=2")).toMatchObject({
      q: "fender",
      category: "chitarre",
      brands: ["nordwood", "pulse-audio"],
      inStock: true,
      sort: "price_desc",
      page: 2,
    });
  });

  it("scarta i valori non validi invece di rompere la pagina", () => {
    expect(parse("sort=toString&page=-3&brand=Non%20Valido,nordwood")).toMatchObject({
      sort: "newest",
      page: 1,
      brands: ["nordwood"],
    });
    expect(parse("page=1.5").page).toBe(1);
    expect(parse("page=abc").page).toBe(1);
  });
});

describe("filtersToParams", () => {
  it("omette i valori predefiniti, così l'URL resta pulito", () => {
    expect(filtersToParams({ brands: [], inStock: false, sort: "newest", page: 1 }).toString()).toBe("");
  });

  it("andata e ritorno dall'URL non perdono nessun filtro", () => {
    const filters = parse("q=basso&category=bassi&brand=nordwood&minPrice=50&maxPrice=900&inStock=true&sort=name&page=4");
    expect(filtersFromParams(filtersToParams(filters))).toEqual(filters);
  });
});
