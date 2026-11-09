import { Link } from "react-router";
import { formatPrice } from "@/lib/format";
import type { ProductSummary } from "@/lib/types";
import { ProductImage } from "./ProductImage";
import { StockBadge } from "./StockBadge";

export function ProductCard({ product }: { product: ProductSummary }) {
  return (
    <Link
      to={`/prodotti/${product.slug}`}
      className="group flex h-full flex-col gap-3 bg-card p-4 transition-colors duration-150 hover:panel focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring"
    >
      <div className="text-silk flex items-center justify-between gap-3 text-muted-foreground">
        <p className="min-w-0 truncate">{product.brand}</p>
        <StockBadge stock={product.stock} />
      </div>
      <ProductImage
        name={product.name}
        imageUrl={product.image_url}
        categorySlug={product.category_slug}
      />
      <h3 className="line-clamp-3 flex-1 text-xl leading-tight font-semibold">{product.name}</h3>
      <p className="font-mono text-base font-medium tabular-nums">{formatPrice(product.price)}</p>
    </Link>
  );
}
