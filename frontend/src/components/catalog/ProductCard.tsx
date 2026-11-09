import { Link } from "react-router";
import { Card, CardContent } from "@/components/ui/card";
import { formatPrice } from "@/lib/format";
import type { ProductSummary } from "@/lib/types";
import { ProductImage } from "./ProductImage";
import { StockBadge } from "./StockBadge";

export function ProductCard({ product }: { product: ProductSummary }) {
  return (
    <Link
      to={`/prodotti/${product.id}`}
      className="group rounded-xl focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
    >
      <Card className="h-full transition-shadow group-hover:shadow-md">
        <CardContent className="flex h-full flex-col gap-3">
          <ProductImage
            name={product.name}
            imageUrl={product.image_url}
            categorySlug={product.category_slug}
          />
          <div className="flex flex-1 flex-col gap-1">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">{product.brand}</p>
            <h3 className="font-medium leading-snug group-hover:underline">{product.name}</h3>
          </div>
          <div className="flex items-center justify-between gap-2">
            <span className="text-lg font-semibold">{formatPrice(product.price)}</span>
            <StockBadge stock={product.stock} />
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
