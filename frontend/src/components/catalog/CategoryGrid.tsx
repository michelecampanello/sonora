import { Link } from "react-router";
import { ArrowUpRight } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

export interface CategoryGridItem {
  id: string;
  name: string;
  description: string | null;
  to: string;
}

/** Le categorie come la scaletta di un disco: numero di traccia, titolo grande, descrizione */
export function CategoryGrid({ items }: { items: CategoryGridItem[] }) {
  return (
    <ol className="border-t">
      {items.map((item, index) => (
        <li key={item.id} className="border-b">
          <Link
            to={item.to}
            className="group grid grid-cols-[2rem_minmax(0,1fr)_auto] items-center gap-x-3 px-2 py-5 transition-colors duration-150 hover:panel focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring md:grid-cols-[4rem_minmax(0,1fr)_minmax(0,22rem)_3rem] md:gap-x-6 md:px-4 md:py-6"
          >
            <span className="text-silk text-muted-foreground tabular-nums">{String(index + 1).padStart(2, "0")}</span>
            <h2 className="text-display text-4xl transition-transform duration-200 group-hover:translate-x-2 md:text-7xl">
              {item.name}
            </h2>
            {item.description && (
              <p className="col-start-2 row-start-2 mt-2 text-sm text-muted-foreground md:col-start-3 md:row-start-1 md:mt-0">
                {item.description}
              </p>
            )}
            <ArrowUpRight
              className="col-start-3 row-start-1 size-6 justify-self-end text-muted-foreground transition-transform duration-200 group-hover:-translate-y-1 group-hover:translate-x-1 group-hover:text-primary md:col-start-4 md:size-8"
              aria-hidden
            />
          </Link>
        </li>
      ))}
    </ol>
  );
}

/** Segnaposto mostrato durante il caricamento, con la stessa forma delle righe vere */
export function CategoryGridSkeleton() {
  return (
    <ul className="border-t" aria-label="Caricamento categorie">
      {Array.from({ length: 6 }, (_, i) => (
        <li key={i} className="flex items-center gap-6 border-b px-2 py-6 md:px-4">
          <Skeleton className="h-3 w-6" />
          <Skeleton className="h-10 w-1/2 md:h-16" />
        </li>
      ))}
    </ul>
  );
}
