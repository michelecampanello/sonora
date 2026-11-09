import { useSearchParams } from "react-router";
import { SORT_OPTIONS, type CatalogFilters, type SortKey } from "@/lib/types";

const isSortKey = (value: string | null): value is SortKey =>
  value !== null && value in SORT_OPTIONS;

/** Legge i filtri dall'URL (es. /catalogo?category=chitarre&brand=1,3&page=2) */
export function filtersFromParams(params: URLSearchParams): CatalogFilters {
  const sort = params.get("sort");
  const page = Number(params.get("page"));
  return {
    q: params.get("q") || undefined,
    category: params.get("category") || undefined,
    brands: (params.get("brand") ?? "")
      .split(",")
      .map(Number)
      .filter((n) => Number.isInteger(n) && n > 0),
    minPrice: params.get("minPrice") || undefined,
    maxPrice: params.get("maxPrice") || undefined,
    inStock: params.get("inStock") === "true",
    sort: isSortKey(sort) ? sort : "newest",
    page: Number.isInteger(page) && page > 0 ? page : 1,
  };
}

/** Trasforma i filtri in parametri URL, omettendo quelli vuoti o di default */
export function filtersToParams(filters: CatalogFilters): URLSearchParams {
  const params = new URLSearchParams();
  if (filters.q) params.set("q", filters.q);
  if (filters.category) params.set("category", filters.category);
  if (filters.brands.length > 0) params.set("brand", filters.brands.join(","));
  if (filters.minPrice) params.set("minPrice", filters.minPrice);
  if (filters.maxPrice) params.set("maxPrice", filters.maxPrice);
  if (filters.inStock) params.set("inStock", "true");
  if (filters.sort !== "newest") params.set("sort", filters.sort);
  if (filters.page > 1) params.set("page", String(filters.page));
  return params;
}

/**
 * I filtri del catalogo vivono nell'URL, non in uno useState:
 * così la pagina si può ricaricare, condividere o aggiungere ai preferiti
 * senza perdere i filtri, e il tasto "indietro" del browser funziona.
 */
export function useCatalogFilters() {
  const [params, setParams] = useSearchParams();
  const filters = filtersFromParams(params);

  /** Aggiorna uno o più filtri. Se non cambi la pagina, si torna alla pagina 1. */
  const updateFilters = (changes: Partial<CatalogFilters>) => {
    const next: CatalogFilters = { ...filters, page: 1, ...changes };
    setParams(filtersToParams(next));
  };

  const resetFilters = () => {
    // la ricerca testuale resta: si azzerano solo i filtri
    setParams(filtersToParams({ q: filters.q, brands: [], inStock: false, sort: "newest", page: 1 }));
  };

  return { filters, updateFilters, resetFilters };
}
