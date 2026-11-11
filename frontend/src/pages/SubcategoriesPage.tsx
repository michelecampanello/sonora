import { Link, useParams } from "react-router";
import { ChevronLeft } from "lucide-react";
import { CategoryGrid, CategoryGridSkeleton } from "@/components/catalog/CategoryGrid";
import { useFetch } from "@/hooks/useFetch";
import { categoriesPath } from "@/lib/api";
import type { Category } from "@/lib/types";

const catalogUrl = (slug: string) => `/catalogo?category=${encodeURIComponent(slug)}`;

/** Pagina di una categoria principale: elenca le sue sottocategorie */
export function SubcategoriesPage() {
  const { slug } = useParams();
  const { data: categories, error } = useFetch<Category[]>(categoriesPath);
  const category = categories?.find((c) => c.slug === slug);

  if (error) {
    return (
      <div className="rounded-lg border border-destructive/50 p-6 text-center">
        <p className="font-medium">Non è stato possibile caricare la categoria.</p>
        <p className="text-sm text-muted-foreground">{error}</p>
      </div>
    );
  }

  if (!categories) return <CategoryGridSkeleton />;

  if (!category) {
    return (
      <div className="flex flex-col items-center gap-4 py-16 text-center">
        <title>Categoria non trovata — Sonora</title>
        <h1 className="text-2xl font-semibold">Categoria non trovata</h1>
        <Link to="/categorie" className="underline underline-offset-4">
          Torna alle categorie
        </Link>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <title>{`${category.name} — Sonora`}</title>

      <nav aria-label="Percorso" className="text-silk flex items-center gap-1 text-muted-foreground">
        <ChevronLeft className="size-3.5" aria-hidden />
        <Link to="/categorie" className="hover:text-foreground hover:underline">
          Categorie
        </Link>
      </nav>

      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="flex flex-col gap-3">
          <h1 className="text-display text-6xl md:text-8xl">{category.name}</h1>
          {category.description && <p className="max-w-xl text-lg text-muted-foreground">{category.description}</p>}
        </div>
        <Link to={catalogUrl(category.slug)} className="text-silk underline underline-offset-4 hover:text-primary">
          Tutti i prodotti di {category.name}
        </Link>
      </div>

      {category.children.length > 0 ? (
        <CategoryGrid
          items={category.children.map(({ id, name, description, slug: childSlug }) => ({
            id,
            name,
            description,
            to: catalogUrl(childSlug),
            image: `/categorie/${childSlug}.svg`,
          }))}
        />
      ) : (
        <p className="rounded-lg border border-dashed p-10 text-center text-muted-foreground">
          Questa categoria non ha sottocategorie.
        </p>
      )}
    </div>
  );
}
