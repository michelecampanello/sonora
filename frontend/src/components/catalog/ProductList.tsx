import { Link } from "react-router"
import { Skeleton } from "@/components/ui/skeleton"
import { formatPrice, formatRating } from "@/lib/format"
import type { ProductSummary } from "@/lib/types"
import { ProductImage } from "./ProductImage"
import { Stars } from "./Stars"
import { StockBadge } from "./StockBadge"

// Una riga per prodotto, separate da filetti come le card della griglia
const LIST = "flex flex-col border-y *:not-last:border-b"
const THUMB = "size-16 shrink-0 sm:size-20"

function ProductRow({ product }: { product: ProductSummary }) {
  return (
    <Link
      to={`/prodotti/${product.slug}`}
      className="flex items-center gap-4 bg-card px-3 py-2.5 transition-colors duration-150 hover:panel focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring"
    >
      <ProductImage
        name={product.name}
        imageUrl={product.image_url}
        categorySlug={product.category_slug}
        sizes="80px"
        className={THUMB}
      />
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <p className="truncate text-silk text-muted-foreground">
          {product.brand}
        </p>
        <h3 className="truncate leading-tight font-semibold">{product.name}</h3>
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-muted-foreground">
          <StockBadge stock={product.stock} />
          {product.rating !== null && product.review_count > 0 && (
            <span className="inline-flex items-center gap-1.5 text-xs tabular-nums">
              <Stars value={product.rating} className="[&_svg]:size-3.5" />
              {formatRating(product.rating)} ({product.review_count})
            </span>
          )}
        </div>
      </div>
      <p className="shrink-0 font-mono text-base font-medium tabular-nums">
        {formatPrice(product.price)}
      </p>
    </Link>
  )
}

/** Vista compatta del catalogo: più prodotti a colpo d'occhio, facili da confrontare per prezzo */
export function ProductList({ products }: { products: ProductSummary[] }) {
  return (
    <ul className={LIST}>
      {products.map((product) => (
        <li key={product.id}>
          <ProductRow product={product} />
        </li>
      ))}
    </ul>
  )
}

/** Segnaposto con la stessa forma delle righe vere */
export function ProductListSkeleton({ count = 8 }: { count?: number }) {
  return (
    <ul className={LIST} aria-label="Caricamento prodotti">
      {Array.from({ length: count }, (_, i) => (
        <li key={i} className="flex items-center gap-4 px-3 py-2.5">
          <Skeleton className={THUMB} />
          <div className="flex flex-1 flex-col gap-2">
            <Skeleton className="h-3 w-24" />
            <Skeleton className="h-4 w-1/2" />
          </div>
          <Skeleton className="h-5 w-16" />
        </li>
      ))}
    </ul>
  )
}
