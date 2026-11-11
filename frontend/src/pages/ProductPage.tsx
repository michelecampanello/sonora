import { Link, useParams } from "react-router";
import { ChevronLeft, ShoppingCart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ProductGallery } from "@/components/catalog/ProductGallery";
import { StockBadge } from "@/components/catalog/StockBadge";
import { addToCart, useCart } from "@/hooks/useCart";
import { useFetch } from "@/hooks/useFetch";
import { productPath } from "@/lib/api";
import { formatPrice } from "@/lib/format";
import type { ProductDetail } from "@/lib/types";

export function ProductPage() {
  const { slug = "" } = useParams();
  const { data: product, error } = useFetch<ProductDetail>(productPath(slug));
  const { items } = useCart();

  if (error) {
    return (
      <div className="flex flex-col items-center gap-4 py-16 text-center">
        <title>Prodotto non trovato — Sonora</title>
        <h1 className="text-2xl font-semibold">Prodotto non trovato</h1>
        <p className="text-muted-foreground">{error}</p>
        <Link to="/catalogo" className="underline underline-offset-4">
          Torna al catalogo
        </Link>
      </div>
    );
  }

  if (!product) return <ProductPageSkeleton />;

  const inCart = items.find((item) => item.productId === product.id)?.quantity ?? 0;

  return (
    <article className="flex flex-col gap-6">
      <title>{`${product.name} — Sonora`}</title>

      <nav aria-label="Percorso" className="text-silk flex items-center gap-1 text-muted-foreground">
        <ChevronLeft className="size-3.5" aria-hidden />
        <Link to={`/catalogo?category=${product.category_slug}`} className="hover:text-foreground hover:underline">
          {product.category}
        </Link>
      </nav>

      <div className="grid gap-8 md:grid-cols-2 md:gap-12">
        {/* La galleria resta ferma mentre si scorrono le caratteristiche */}
        <div className="md:sticky md:top-24 md:self-start">
          {/* key: passando a un altro prodotto la galleria riparte dalla prima immagine */}
          <ProductGallery
            key={product.id}
            name={product.name}
            categorySlug={product.category_slug}
            images={product.images}
          />
        </div>

        <div className="flex flex-col gap-6">
          <div className="flex flex-col gap-3">
            <Link
              to={`/catalogo?brand=${product.brand_slug}`}
              className="text-silk text-muted-foreground hover:text-foreground"
            >
              {product.brand}
            </Link>
            <h1 className="text-display text-[clamp(2.75rem,5.5vw,5.5rem)]">{product.name}</h1>
            <p className="text-silk text-muted-foreground">Codice articolo: {product.sku}</p>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 border-y py-4">
            <span className="font-mono text-2xl font-medium tabular-nums md:text-3xl">{formatPrice(product.price)}</span>
            <StockBadge stock={product.stock} />
          </div>

          {product.description && <p className="text-lg leading-relaxed text-muted-foreground">{product.description}</p>}

          <div className="flex flex-col gap-3">
            <Button
              size="lg"
              variant="signal"
              className="h-14 w-full"
              disabled={inCart >= product.stock}
              onClick={() => addToCart(product.id, product.stock)}
            >
              <ShoppingCart /> Aggiungi al carrello
            </Button>
            <p role="status" className="text-sm text-muted-foreground">
              {inCart > 0 && (
                <>
                  {inCart} nel carrello ·{" "}
                  <Link to="/carrello" className="text-foreground underline underline-offset-4">
                    Vai al carrello
                  </Link>
                </>
              )}
            </p>
          </div>

          {product.specs.length > 0 && (
            <section aria-labelledby="specs-title" className="flex flex-col gap-3">
              <h2 id="specs-title" className="text-display text-3xl md:text-4xl">
                Caratteristiche
              </h2>
              <table className="w-full border-t text-sm">
                <tbody>
                  {product.specs.map((spec) => (
                    <tr key={spec.label} className="border-b">
                      <th scope="row" className="text-silk w-2/5 py-3 pr-4 text-left text-muted-foreground">
                        {spec.label}
                      </th>
                      <td className="py-3 font-medium">{spec.value}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </section>
          )}
        </div>
      </div>
    </article>
  );
}

function ProductPageSkeleton() {
  return (
    <div className="grid gap-8 md:grid-cols-2 md:gap-12" aria-label="Caricamento prodotto">
      <Skeleton className="aspect-square w-full rounded-xl" />
      <div className="flex flex-col gap-4">
        <Skeleton className="h-4 w-1/4" />
        <Skeleton className="h-9 w-3/4" />
        <Skeleton className="h-8 w-1/3" />
        <Skeleton className="h-20 w-full" />
        <Skeleton className="h-10 w-48" />
      </div>
    </div>
  );
}
