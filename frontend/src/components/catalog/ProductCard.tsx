import { Link } from "react-router"
import { formatPrice, formatRating } from "@/lib/format"
import type { ProductSummary } from "@/lib/types"
import { ProductImage } from "./ProductImage"
import { Stars } from "./Stars"
import { StockBadge } from "./StockBadge"

export function ProductCard({ product }: { product: ProductSummary }) {
  return (
    <Link
      to={`/prodotti/${product.slug}`}
      className="group flex h-full flex-col gap-3 bg-card p-4 transition-colors duration-150 hover:panel focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring"
    >
      <div className="flex items-center justify-between gap-3 text-silk text-muted-foreground">
        <p className="min-w-0 truncate">{product.brand}</p>
        <StockBadge stock={product.stock} />
      </div>
      <ProductImage
        name={product.name}
        imageUrl={product.image_url}
        categorySlug={product.category_slug}
      />
      <h3 className="line-clamp-3 flex-1 text-xl leading-tight font-semibold">
        {product.name}
      </h3>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="font-mono text-base font-medium tabular-nums">
          {formatPrice(product.price)}
        </p>
        {product.rating !== null && product.review_count > 0 && (
          <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground tabular-nums">
            <Stars value={product.rating} className="[&_svg]:size-3.5" />
            {formatRating(product.rating)} ({product.review_count})
          </span>
        )}
      </div>
    </Link>
  )
}
