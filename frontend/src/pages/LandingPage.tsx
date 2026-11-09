import { Link } from "react-router";
import { ArrowRight } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { CategoryGrid, CategoryGridSkeleton } from "@/components/catalog/CategoryGrid";
import { ProductGrid, ProductGridSkeleton } from "@/components/catalog/ProductGrid";
import { HeroWaveform } from "@/components/layout/HeroWaveform";
import { useFetch } from "@/hooks/useFetch";
import { categoriesPath, featuredProductsPath } from "@/lib/api";
import type { Category, Paginated, ProductSummary } from "@/lib/types";

export function LandingPage() {
  const { data, error } = useFetch<Paginated<ProductSummary>>(featuredProductsPath);
  const { data: categories, error: categoriesError } = useFetch<Category[]>(categoriesPath);

  return (
    <div className="flex flex-col gap-16 md:gap-24">
      <title>Sonora — Strumenti musicali</title>

      <section className="panel full-bleed -mt-8 overflow-hidden md:-mt-12">
        <div className="mx-auto flex max-w-[96rem] flex-col gap-8 px-4 pt-8 md:gap-12 md:px-8 md:pt-12">
          <p className="text-silk flex flex-wrap justify-between gap-x-8 gap-y-1 text-muted-foreground">
            <span>Strumenti musicali</span>
            <span>Chitarre / Bassi / Batterie / Tastiere / Studio</span>
          </p>

          <h1 className="text-display text-[clamp(3.75rem,13vw,14rem)] motion-safe:animate-in motion-safe:duration-700 motion-safe:fade-in motion-safe:slide-in-from-bottom-6">
            Trova il <br className="hidden md:block" />
            <span className="text-signal">suono</span> che cerchi
          </h1>

          <div className="flex flex-wrap items-end justify-between gap-6">
            <p className="max-w-md text-lg text-muted-foreground">
              Chitarre, bassi, batterie, tastiere e tutto il necessario per registrare, in un unico catalogo.
            </p>
            <div className="flex flex-wrap gap-3">
              <Link to="/catalogo" className={buttonVariants({ size: "lg", variant: "signal" })}>
                Sfoglia il catalogo <ArrowRight data-icon="inline-end" />
              </Link>
              <Link to="/categorie" className={buttonVariants({ size: "lg", variant: "outline" })}>
                Esplora le categorie
              </Link>
            </div>
          </div>
        </div>

        <HeroWaveform className="mt-6 h-32 text-foreground md:mt-10 md:h-52" />
        <div className="ticks text-muted-foreground/50" aria-hidden />
      </section>

      {!categoriesError && (
        <section aria-label="Reparti" className="flex flex-col gap-4">
          <p className="text-silk text-muted-foreground">Reparti</p>
          {!categories ? (
            <CategoryGridSkeleton />
          ) : (
            <CategoryGrid
              items={categories.map(({ id, name, description, slug }) => ({
                id,
                name,
                description,
                to: `/categorie/${slug}`,
              }))}
            />
          )}
        </section>
      )}

      <section aria-labelledby="featured-title" className="flex flex-col gap-6">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <h2 id="featured-title" className="text-display text-5xl md:text-7xl">
            In evidenza
          </h2>
          <Link to="/catalogo" className="text-silk underline underline-offset-4 hover:text-primary">
            Tutti i prodotti
          </Link>
        </div>

        {error ? (
          <div className="border border-destructive/50 p-6 text-center">
            <p className="font-medium">Non è stato possibile caricare i prodotti in evidenza.</p>
            <p className="text-sm text-muted-foreground">{error}</p>
          </div>
        ) : !data ? (
          <ProductGridSkeleton />
        ) : data.items.length === 0 ? (
          <p className="border border-dashed p-10 text-center text-muted-foreground">
            Al momento non ci sono prodotti in evidenza.
          </p>
        ) : (
          <ProductGrid products={data.items} />
        )}
      </section>
    </div>
  );
}
