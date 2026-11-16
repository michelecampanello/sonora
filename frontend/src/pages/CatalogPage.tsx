import { Button } from "@/components/ui/button";
import { CatalogFilters } from "@/components/catalog/CatalogFilters";
import { LoadMore } from "@/components/catalog/LoadMore";
import { ProductGrid, ProductGridSkeleton } from "@/components/catalog/ProductGrid";
import { ProductList, ProductListSkeleton } from "@/components/catalog/ProductList";
import { ViewToggle } from "@/components/catalog/ViewToggle";
import { useCatalogFilters } from "@/hooks/useCatalogFilters";
import { useCatalogView } from "@/hooks/useCatalogView";
import { useFetch } from "@/hooks/useFetch";
import { useInfiniteProducts } from "@/hooks/useInfiniteProducts";
import { categoriesPath } from "@/lib/api";
import { cn } from "@/lib/utils";
import type { Category } from "@/lib/types";
import { PageMeta } from "@/components/PageMeta";

/** Titolo della pagina in base a ricerca e categoria attive */
function catalogHeading(q: string | undefined, categoryName: string | undefined): string {
  if (q) return categoryName ? `Risultati per "${q}" in ${categoryName}` : `Risultati per "${q}"`;
  return categoryName ?? "Catalogo";
}

export function CatalogPage() {
  const { filters, updateFilters, resetFilters } = useCatalogFilters();
  const { view, changeView } = useCatalogView();
  const catalog = useInfiniteProducts(filters);
  const { products, total, error } = catalog;
  const { data: categories } = useFetch<Category[]>(categoriesPath);

  const categoryName = categories
    ?.flatMap((category) => [category, ...category.children])
    .find((category) => category.slug === filters.category)?.name;
  const heading = catalogHeading(filters.q, categoryName);

  return (
    <div className="flex flex-col gap-6">
      <PageMeta title={heading} />

      <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-2">
        <h1 className="text-display text-6xl md:text-8xl">{heading}</h1>
        {total !== undefined && (
          <p className="text-silk text-muted-foreground tabular-nums" aria-live="polite">
            {total === 1 ? "1 prodotto" : `${total} prodotti`}
          </p>
        )}
      </div>

      <CatalogFilters
        filters={filters}
        categoryName={categoryName}
        onChange={updateFilters}
        onReset={resetFilters}
        actions={<ViewToggle value={view} onChange={changeView} />}
      />

      {error ? (
        <div className="rounded-lg border border-destructive/50 p-6 text-center">
          <p className="font-medium">Non è stato possibile caricare i prodotti.</p>
          <p className="text-sm text-muted-foreground">{error}</p>
          <Button variant="outline" size="sm" className="mt-3" onClick={catalog.retry}>
            Riprova
          </Button>
        </div>
      ) : !products ? (
        view === "list" ? (
          <ProductListSkeleton count={8} />
        ) : (
          <ProductGridSkeleton wide count={8} />
        )
      ) : products.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-lg border border-dashed p-10 text-center">
          <p className="font-medium">Nessun prodotto corrisponde ai filtri scelti.</p>
          <Button variant="outline" onClick={resetFilters}>
            Azzera filtri
          </Button>
        </div>
      ) : (
        // Durante il cambio di filtri restano i risultati precedenti, attenuati, invece di far lampeggiare la pagina
        <div
          className={cn("flex flex-col gap-8 transition-opacity", catalog.refreshing && "opacity-60")}
          aria-busy={catalog.refreshing || catalog.loadingMore}
        >
          {view === "list" ? <ProductList products={products} /> : <ProductGrid wide products={products} />}
          {!catalog.refreshing && (
            <LoadMore
              hasMore={catalog.hasMore}
              loading={catalog.loadingMore}
              error={catalog.loadMoreError}
              shown={products.length}
              total={total ?? products.length}
              onLoadMore={catalog.loadMore}
              onRetry={catalog.retry}
            />
          )}
        </div>
      )}
    </div>
  );
}
