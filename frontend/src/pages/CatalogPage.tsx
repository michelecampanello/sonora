import { Button } from "@/components/ui/button";
import { CatalogFilters } from "@/components/catalog/CatalogFilters";
import { Pagination } from "@/components/catalog/Pagination";
import { ProductGrid, ProductGridSkeleton } from "@/components/catalog/ProductGrid";
import { useCatalogFilters } from "@/hooks/useCatalogFilters";
import { useFetch } from "@/hooks/useFetch";
import { categoriesPath, productsPath } from "@/lib/api";
import { cn } from "@/lib/utils";
import type { Category, Paginated, ProductSummary } from "@/lib/types";

/** Titolo della pagina in base a ricerca e categoria attive */
function catalogHeading(q: string | undefined, categoryName: string | undefined): string {
  if (q) return categoryName ? `Risultati per "${q}" in ${categoryName}` : `Risultati per "${q}"`;
  return categoryName ?? "Catalogo";
}

export function CatalogPage() {
  const { filters, updateFilters, resetFilters } = useCatalogFilters();
  const { data, previousData, error, loading } = useFetch<Paginated<ProductSummary>>(
    productsPath(filters)
  );
  const { data: categories } = useFetch<Category[]>(categoriesPath);

  const categoryName = categories
    ?.flatMap((category) => [category, ...category.children])
    .find((category) => category.slug === filters.category)?.name;
  const heading = catalogHeading(filters.q, categoryName);

  // Durante il caricamento continuiamo a mostrare i risultati precedenti (attenuati)
  // invece di far lampeggiare la pagina a ogni click su un filtro.
  const result = data ?? previousData;

  const changePage = (page: number) => {
    updateFilters({ page });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <div className="flex flex-col gap-6">
      <title>{`${heading} — Sonora`}</title>

      <div>
        <h1 className="text-2xl font-semibold tracking-tight">{heading}</h1>
        {result && (
          <p className="text-sm text-muted-foreground" aria-live="polite">
            {result.total === 1 ? "1 prodotto" : `${result.total} prodotti`}
          </p>
        )}
      </div>

      <CatalogFilters
        filters={filters}
        categoryName={categoryName}
        onChange={updateFilters}
        onReset={resetFilters}
      />

      {error ? (
        <div className="rounded-lg border border-destructive/50 p-6 text-center">
          <p className="font-medium">Non è stato possibile caricare i prodotti.</p>
          <p className="text-sm text-muted-foreground">{error}</p>
        </div>
      ) : !result ? (
        <ProductGridSkeleton wide count={8} />
      ) : result.items.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-lg border border-dashed p-10 text-center">
          <p className="font-medium">Nessun prodotto corrisponde ai filtri scelti.</p>
          <Button variant="outline" onClick={resetFilters}>
            Azzera filtri
          </Button>
        </div>
      ) : (
        <div className={cn("flex flex-col gap-8 transition-opacity", loading && "opacity-60")} aria-busy={loading}>
          <ProductGrid wide products={result.items} />
          <Pagination page={result.page} pages={result.pages} onChange={changePage} />
        </div>
      )}
    </div>
  );
}
