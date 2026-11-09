import { Skeleton } from "@/components/ui/skeleton";
import type { ProductSummary } from "@/lib/types";
import { ProductCard } from "./ProductCard";

const GRID = "grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3";

export function ProductGrid({ products }: { products: ProductSummary[] }) {
  return (
    <ul className={GRID}>
      {products.map((product) => (
        <li key={product.id}>
          <ProductCard product={product} />
        </li>
      ))}
    </ul>
  );
}

/** Segnaposto mostrato al primo caricamento, con la stessa forma delle card vere */
export function ProductGridSkeleton({ count = 6 }: { count?: number }) {
  return (
    <ul className={GRID} aria-label="Caricamento prodotti">
      {Array.from({ length: count }, (_, i) => (
        <li key={i} className="flex flex-col gap-3 rounded-xl border p-4">
          <Skeleton className="aspect-square w-full" />
          <Skeleton className="h-3 w-1/3" />
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-6 w-1/4" />
        </li>
      ))}
    </ul>
  );
}
