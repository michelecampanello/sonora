import { lazy, Suspense, useState } from "react"
import { Link, useNavigate, useParams } from "react-router"
import { ChevronLeft, Pencil, ShoppingCart } from "lucide-react"
import { ListSkeleton } from "@/components/account/AccountParts"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { ProductGallery } from "@/components/catalog/ProductGallery"
import { ProductReviews } from "@/components/catalog/ProductReviews"
import { Stars } from "@/components/catalog/Stars"
import { StockBadge } from "@/components/catalog/StockBadge"
import { useAuth } from "@/hooks/useAuth"
import { addToCart, useCart } from "@/hooks/useCart"
import { useFetch } from "@/hooks/useFetch"
import { productPath } from "@/lib/api"
import { formatPrice, formatRating, reviewCount } from "@/lib/format"
import type { AdminProductDetail, ProductDetail } from "@/lib/types"
import { PageMeta } from "@/components/PageMeta"

// Il form di modifica è un file a parte, scaricato solo quando un admin lo apre
const ProductEditor = lazy(() => import("@/components/admin/ProductEditor"))

/** Description per i motori di ricerca: la descrizione del prodotto, accorciata, o un riassunto */
function productDescription(product: ProductDetail): string {
  const text =
    product.description ??
    `${product.name} di ${product.brand}, nella categoria ${product.category}. Prezzo ${formatPrice(product.price)}.`
  return text.length > 160 ? `${text.slice(0, 157).trimEnd()}…` : text
}

/** Dati strutturati schema.org: Google può mostrare prezzo e disponibilità direttamente nei risultati */
function ProductJsonLd({ product }: { product: ProductDetail }) {
  const data = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.name,
    sku: product.sku,
    description: product.description ?? undefined,
    brand: { "@type": "Brand", name: product.brand },
    category: product.category,
    image:
      product.images.length > 0
        ? product.images.map((image) => image.url)
        : undefined,
    offers: {
      "@type": "Offer",
      url: `${window.location.origin}/prodotti/${product.slug}`,
      price: product.price,
      priceCurrency: "EUR",
      availability:
        product.stock > 0
          ? "https://schema.org/InStock"
          : "https://schema.org/OutOfStock",
    },
    // Con le recensioni Google può mostrare le stelle nei risultati di ricerca
    aggregateRating:
      product.rating !== null && product.review_count > 0
        ? {
            "@type": "AggregateRating",
            ratingValue: product.rating,
            reviewCount: product.review_count,
            bestRating: 5,
            worstRating: 1,
          }
        : undefined,
  }
  // "<" diventa \u003c: un nome con "</script>" non può chiudere il tag in anticipo
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{
        __html: JSON.stringify(data).replace(/</g, "\\u003c"),
      }}
    />
  )
}

export function ProductPage() {
  const { slug = "" } = useParams()
  const {
    data: product,
    error,
    reload,
  } = useFetch<ProductDetail>(productPath(slug))
  const { items } = useCart()
  const { user } = useAuth()
  const navigate = useNavigate()
  // Legati allo slug: passando a un altro prodotto il form si chiude e l'avviso sparisce
  const [editingSlug, setEditingSlug] = useState<string | null>(null)
  const [savedSlug, setSavedSlug] = useState<string | null>(null)
  const isAdmin = user?.role === "admin"
  const editing = isAdmin && editingSlug === slug

  if (error) {
    return (
      <div className="flex flex-col items-center gap-4 py-16 text-center">
        <PageMeta title="Prodotto non trovato" noindex />
        <h1 className="text-2xl font-semibold">Prodotto non trovato</h1>
        <p className="text-muted-foreground">{error}</p>
        <Link to="/catalogo" className="underline underline-offset-4">
          Torna al catalogo
        </Link>
      </div>
    )
  }

  if (!product) return <ProductPageSkeleton />

  const inCart =
    items.find((item) => item.productId === product.id)?.quantity ?? 0

  const startEditing = () => {
    setSavedSlug(null)
    setEditingSlug(slug)
  }

  const onSaved = (updated: AdminProductDetail) => {
    if (!updated.active) {
      // Tolto dalla vendita: la pagina pubblica non esiste più, si continua dal pannello
      navigate(`/admin/prodotti/${updated.id}`, {
        state: {
          notice:
            "Modifiche salvate. Il prodotto non è più in vendita, quindi non compare nel negozio.",
        },
      })
      return
    }
    setEditingSlug(null)
    setSavedSlug(slug)
    reload()
    window.scrollTo({ top: 0, behavior: "smooth" })
  }

  const meta = (
    <>
      <PageMeta
        title={product.name}
        description={productDescription(product)}
        image={product.images[0]?.url}
      />
      <ProductJsonLd product={product} />
    </>
  )

  if (editing) {
    return (
      <article className="flex flex-col gap-6">
        {meta}
        <div className="flex flex-col gap-2 border-b pb-6">
          <p className="text-silk text-muted-foreground">Modifica prodotto</p>
          <h1 className="text-display text-[clamp(2.25rem,4.5vw,4rem)]">
            {product.name}
          </h1>
        </div>
        <Suspense fallback={<ListSkeleton />}>
          <ProductEditor
            productId={product.id}
            onSaved={onSaved}
            onCancel={() => setEditingSlug(null)}
          />
        </Suspense>
      </article>
    )
  }

  return (
    <article className="flex flex-col gap-6">
      {meta}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <nav
          aria-label="Percorso"
          className="flex items-center gap-1 text-silk text-muted-foreground"
        >
          <ChevronLeft className="size-3.5" aria-hidden />
          <Link
            to={`/catalogo?category=${product.category_slug}`}
            className="hover:text-foreground hover:underline"
          >
            {product.category}
          </Link>
        </nav>
        {isAdmin && (
          <Button variant="outline" size="sm" onClick={startEditing}>
            <Pencil /> Modifica prodotto
          </Button>
        )}
      </div>

      {isAdmin && savedSlug === slug && (
        <p role="status" className="border border-border p-3 text-sm">
          Modifiche salvate.
        </p>
      )}

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
            <h1 className="text-display text-[clamp(2.75rem,5.5vw,5.5rem)]">
              {product.name}
            </h1>
            <p className="text-silk text-muted-foreground">
              Codice articolo: {product.sku}
            </p>
            <a
              href="#recensioni"
              className="inline-flex items-center gap-2 self-start text-sm text-muted-foreground hover:text-foreground"
            >
              {product.rating !== null && product.review_count > 0 ? (
                <>
                  <Stars value={product.rating} />
                  <span className="tabular-nums">
                    {formatRating(product.rating)} ·{" "}
                    {reviewCount(product.review_count)}
                  </span>
                </>
              ) : (
                <span className="underline underline-offset-4">
                  Nessuna recensione: scrivi la prima
                </span>
              )}
            </a>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 border-y py-4">
            <span className="font-mono text-2xl font-medium tabular-nums md:text-3xl">
              {formatPrice(product.price)}
            </span>
            <StockBadge stock={product.stock} />
          </div>

          {product.description && (
            <p className="text-lg leading-relaxed text-muted-foreground">
              {product.description}
            </p>
          )}

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
                  <Link
                    to="/carrello"
                    className="text-foreground underline underline-offset-4"
                  >
                    Vai al carrello
                  </Link>
                </>
              )}
            </p>
          </div>

          {product.specs.length > 0 && (
            <section
              aria-labelledby="specs-title"
              className="flex flex-col gap-3"
            >
              <h2
                id="specs-title"
                className="text-display text-3xl md:text-4xl"
              >
                Caratteristiche
              </h2>
              <table className="w-full border-t text-sm">
                <tbody>
                  {product.specs.map((spec) => (
                    <tr key={spec.label} className="border-b">
                      <th
                        scope="row"
                        className="w-2/5 py-3 pr-4 text-left text-silk text-muted-foreground"
                      >
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

      {/* onChange: dopo ogni recensione si aggiornano anche media e numero qui sopra */}
      <ProductReviews slug={product.slug} onChange={reload} />
    </article>
  )
}

function ProductPageSkeleton() {
  return (
    <div
      className="grid gap-8 md:grid-cols-2 md:gap-12"
      aria-label="Caricamento prodotto"
    >
      <Skeleton className="aspect-square w-full rounded-xl" />
      <div className="flex flex-col gap-4">
        <Skeleton className="h-4 w-1/4" />
        <Skeleton className="h-9 w-3/4" />
        <Skeleton className="h-8 w-1/3" />
        <Skeleton className="h-20 w-full" />
        <Skeleton className="h-10 w-48" />
      </div>
    </div>
  )
}
