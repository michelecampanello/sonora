import { Link } from "react-router";
import { Minus, Plus, ShoppingCart, Trash2 } from "lucide-react";
import { OrderTotals } from "@/components/cart/OrderTotals";
import { ProductImage } from "@/components/catalog/ProductImage";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  MAX_QUANTITY,
  removeFromCart,
  setCartQuantity,
  useCartLines,
  type CartLine,
} from "@/hooks/useCart";
import { formatPrice } from "@/lib/format";

function CartRow({ line }: { line: CartLine }) {
  const { product, quantity } = line;
  const lineTotal = (Math.round(Number(product.price) * 100) * quantity) / 100;

  return (
    <li className="flex gap-4 py-4">
      <Link to={`/prodotti/${product.slug}`} className="w-20 shrink-0 sm:w-24">
        <ProductImage name={product.name} imageUrl={product.image_url} categorySlug={product.category_slug} />
      </Link>

      <div className="flex min-w-0 flex-1 flex-col gap-2">
        <div className="flex justify-between gap-3">
          <div className="min-w-0">
            <p className="text-silk text-muted-foreground">{product.brand}</p>
            <Link to={`/prodotti/${product.slug}`} className="font-medium hover:underline">
              {product.name}
            </Link>
            <p className="text-sm text-muted-foreground">{formatPrice(product.price)}</p>
          </div>
          <p className="shrink-0 font-mono font-medium tabular-nums">{formatPrice(lineTotal)}</p>
        </div>

        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-1" role="group" aria-label={`Quantità di ${product.name}`}>
            <Button
              variant="outline"
              size="icon-sm"
              aria-label="Diminuisci quantità"
              disabled={quantity <= 1}
              onClick={() => setCartQuantity(product.id, quantity - 1)}
            >
              <Minus />
            </Button>
            <span className="w-8 text-center text-sm tabular-nums" aria-live="polite">
              {quantity}
            </span>
            <Button
              variant="outline"
              size="icon-sm"
              aria-label="Aumenta quantità"
              disabled={quantity >= Math.min(product.stock, MAX_QUANTITY)}
              onClick={() => setCartQuantity(product.id, quantity + 1)}
            >
              <Plus />
            </Button>
          </div>
          <Button variant="ghost" size="sm" onClick={() => removeFromCart(product.id)}>
            <Trash2 /> Rimuovi
          </Button>
        </div>

        {quantity > product.stock && (
          <p className="text-sm text-destructive">
            {product.stock === 0
              ? "Non più disponibile: rimuovilo per continuare."
              : `Disponibili solo ${product.stock} pezzi: riduci la quantità per continuare.`}
          </p>
        )}
      </div>
    </li>
  );
}

export function CartPage() {
  const { lines, count, total, error, loading, hasStockProblems } = useCartLines();

  return (
    <div className="flex flex-col gap-6">
      <title>Carrello — Sonora</title>
      <h1 className="text-display text-6xl md:text-8xl">Carrello</h1>

      {count === 0 ? (
        <div className="flex flex-col items-center gap-3 border border-dashed p-10 text-center">
          <ShoppingCart className="size-8 text-muted-foreground" strokeWidth={1.5} aria-hidden />
          <p className="font-medium">Il carrello è vuoto.</p>
          <Button variant="outline" nativeButton={false} render={<Link to="/catalogo" />}>
            Vai al catalogo
          </Button>
        </div>
      ) : error ? (
        <div className="rounded-lg border border-destructive/50 p-6 text-center">
          <p className="font-medium">Non è stato possibile caricare il carrello.</p>
          <p className="text-sm text-muted-foreground">{error}</p>
        </div>
      ) : loading ? (
        <Skeleton className="h-64 w-full" />
      ) : (
        <div className="grid items-start gap-6 lg:grid-cols-[1fr_340px] lg:gap-10">
          <ul className="divide-y border-y">
            {lines.map((line) => (
              <CartRow key={line.product.id} line={line} />
            ))}
          </ul>

          <Card className="panel lg:sticky lg:top-24">
            <CardContent className="flex flex-col gap-4">
              <h2 className="text-display text-3xl">Riepilogo</h2>
              <OrderTotals total={total} />
              {hasStockProblems ? (
                <Button size="lg" disabled>
                  Vai alla cassa
                </Button>
              ) : (
                <Button size="lg" nativeButton={false} render={<Link to="/checkout" />}>
                  Vai alla cassa
                </Button>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
