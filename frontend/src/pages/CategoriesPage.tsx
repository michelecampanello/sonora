import { Link } from "react-router";
import { CategoryGrid, CategoryGridSkeleton } from "@/components/catalog/CategoryGrid";
import { useFetch } from "@/hooks/useFetch";
import { categoriesPath } from "@/lib/api";
import type { Category } from "@/lib/types";

/** Elenco delle categorie principali: ognuna porta alla pagina con le sue sottocategorie */
export function CategoriesPage() {
  const { data: categories, error } = useFetch<Category[]>(categoriesPath);

  return (
    <div className="flex flex-col gap-6">
      <title>Categorie — Sonora</title>

      <div className="flex flex-wrap items-end justify-between gap-3">
        <h1 className="text-display text-6xl md:text-8xl">Categorie</h1>
        <Link to="/catalogo" className="text-silk underline underline-offset-4 hover:text-primary">
          Tutti i prodotti
        </Link>
      </div>

      {error ? (
        <div className="rounded-lg border border-destructive/50 p-6 text-center">
          <p className="font-medium">Non è stato possibile caricare le categorie.</p>
          <p className="text-sm text-muted-foreground">{error}</p>
        </div>
      ) : !categories ? (
        <CategoryGridSkeleton />
      ) : (
        <CategoryGrid
          items={categories.map(({ id, name, description, slug }) => ({
            id,
            name,
            description,
            to: `/categorie/${slug}`,
            image: `/categorie/${slug}.svg`,
          }))}
        />
      )}
    </div>
  );
}
