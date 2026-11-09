import { Link } from "react-router";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

const GRID = "grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3";

export interface CategoryGridItem {
  id: number;
  name: string;
  description: string | null;
  to: string;
}

export function CategoryGrid({ items }: { items: CategoryGridItem[] }) {
  return (
    <ul className={GRID}>
      {items.map((item) => (
        <li key={item.id}>
          <Link
            to={item.to}
            className="group block h-full rounded-xl focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
          >
            <Card className="h-full transition-shadow group-hover:shadow-md">
              <CardContent className="flex flex-col gap-1">
                <h2 className="text-lg font-semibold group-hover:underline">{item.name}</h2>
                {item.description && <p className="text-sm text-muted-foreground">{item.description}</p>}
              </CardContent>
            </Card>
          </Link>
        </li>
      ))}
    </ul>
  );
}

/** Segnaposto mostrato durante il caricamento, con la stessa forma delle card vere */
export function CategoryGridSkeleton() {
  return (
    <ul className={GRID} aria-label="Caricamento categorie">
      {Array.from({ length: 6 }, (_, i) => (
        <li key={i} className="flex flex-col gap-3 rounded-xl border p-4">
          <Skeleton className="h-6 w-1/2" />
          <Skeleton className="h-4 w-3/4" />
        </li>
      ))}
    </ul>
  );
}
