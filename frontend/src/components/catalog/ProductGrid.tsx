import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import type { ProductSummary } from "@/lib/types";
import { ProductCard } from "./ProductCard";

// Le celle condividono i filetti, come i moduli di un rack
const RACK = "grid grid-cols-1 border-t border-l *:border-r *:border-b sm:grid-cols-2";
const GRID = cn(RACK, "xl:grid-cols-3");
/** Per le pagine che occupano tutta la larghezza con molti prodotti, come il catalogo */
const WIDE_GRID = cn(RACK, "lg:grid-cols-3 xl:grid-cols-4");

interface ProductGridProps {
  products: ProductSummary[];
  wide?: boolean;
}

export function ProductGrid({ products, wide = false }: ProductGridProps) {
  return (
    <ul className={wide ? WIDE_GRID : GRID}>
      {products.map((product) => (
        <li key={product.id}>
          <ProductCard product={product} />
        </li>
      ))}
    </ul>
  );
}

/** Segnaposto mostrato al primo caricamento, con la stessa forma delle card vere */
export function ProductGridSkeleton({ count = 6, wide = false }: { count?: number; wide?: boolean }) {
  return (
    <ul className={wide ? WIDE_GRID : GRID} aria-label="Caricamento prodotti">
      {Array.from({ length: count }, (_, i) => (
        <li key={i} className="flex flex-col gap-3 p-4">
          <Skeleton className="h-3 w-1/3" />
          <Skeleton className="aspect-square w-full" />
          <Skeleton className="h-5 w-3/4" />
          <Skeleton className="h-5 w-1/4" />
        </li>
      ))}
    </ul>
  );
}
