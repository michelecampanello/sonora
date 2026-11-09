import { Link } from "react-router";
import { AudioWaveform } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { ProductGrid, ProductGridSkeleton } from "@/components/catalog/ProductGrid";
import { useFetch } from "@/hooks/useFetch";
import { featuredProductsPath } from "@/lib/api";
import type { Paginated, ProductSummary } from "@/lib/types";

export function LandingPage() {
  const { data, error } = useFetch<Paginated<ProductSummary>>(featuredProductsPath);

  return (
    <div className="flex flex-col gap-12">
      <title>Sonora — Strumenti musicali</title>

      <section className="flex items-center justify-between gap-8 rounded-2xl bg-muted px-6 py-14 md:px-12 md:py-20">
        <div className="flex max-w-xl flex-col gap-5">
          <h1 className="text-4xl font-semibold tracking-tight md:text-5xl">Trova il suono che cerchi</h1>
          <p className="text-lg text-muted-foreground">
            Chitarre, bassi, batterie, tastiere e tutto il necessario per registrare, in un unico catalogo.
          </p>
          <div className="flex flex-wrap gap-3">
            <Link to="/catalogo" className={buttonVariants({ size: "lg" })}>
              Sfoglia il catalogo
            </Link>
            <Link to="/categorie" className={buttonVariants({ size: "lg", variant: "outline" })}>
              Esplora le categorie
            </Link>
          </div>
        </div>
        <AudioWaveform className="hidden size-48 shrink-0 text-primary md:block" strokeWidth={1} aria-hidden />
      </section>

      <section aria-labelledby="featured-title" className="flex flex-col gap-6">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <h2 id="featured-title" className="text-2xl font-semibold tracking-tight">
            In evidenza
          </h2>
          <Link to="/catalogo" className="text-sm underline underline-offset-4">
            Tutti i prodotti
          </Link>
        </div>

        {error ? (
          <div className="rounded-lg border border-destructive/50 p-6 text-center">
            <p className="font-medium">Non è stato possibile caricare i prodotti in evidenza.</p>
            <p className="text-sm text-muted-foreground">{error}</p>
          </div>
        ) : !data ? (
          <ProductGridSkeleton />
        ) : data.items.length === 0 ? (
          <p className="rounded-lg border border-dashed p-10 text-center text-muted-foreground">
            Al momento non ci sono prodotti in evidenza.
          </p>
        ) : (
          <ProductGrid products={data.items} />
        )}
      </section>
    </div>
  );
}
