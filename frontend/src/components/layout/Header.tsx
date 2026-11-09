import type { FormEvent } from "react";
import { Link, NavLink, useNavigate, useSearchParams } from "react-router";
import { Search, ShoppingCart } from "lucide-react";
import { Input } from "@/components/ui/input";
import { useCart } from "@/hooks/useCart";
import { LevelMark } from "./LevelMark";

const NAV_LINK =
  "text-silk border-b-2 border-transparent py-1 text-muted-foreground transition-colors hover:text-foreground aria-[current=page]:border-signal aria-[current=page]:text-foreground";

export function Header() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const currentQuery = params.get("q") ?? "";
  const { count } = useCart();

  const search = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const q = String(new FormData(event.currentTarget).get("q") ?? "").trim();
    navigate(q ? `/catalogo?q=${encodeURIComponent(q)}` : "/catalogo");
  };

  return (
    <header className="sticky top-0 z-20 border-b bg-background/95 backdrop-blur-md">
      <div className="mx-auto flex min-h-16 max-w-[96rem] flex-wrap items-center gap-x-6 gap-y-1 px-4 py-2 sm:flex-nowrap sm:py-0 md:px-8">
        <Link to="/" className="flex shrink-0 items-center gap-2">
          <LevelMark className="text-primary" />
          <span className="text-display text-3xl">Sonora</span>
        </Link>

        {/* Su mobile i link vanno su una seconda riga, per lasciare spazio alla ricerca */}
        <nav aria-label="Principale" className="order-last flex w-full shrink-0 gap-5 sm:order-none sm:w-auto">
          <NavLink to="/catalogo" className={NAV_LINK}>
            Catalogo
          </NavLink>
          <NavLink to="/categorie" className={NAV_LINK}>
            Categorie
          </NavLink>
        </nav>

        <form onSubmit={search} role="search" className="relative ml-auto min-w-0 max-w-md flex-1">
          <Search className="pointer-events-none absolute top-1/2 left-0 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
          {/* key: se la ricerca nell'URL cambia (es. torni indietro), il campo si aggiorna */}
          <Input
            key={currentQuery}
            name="q"
            type="search"
            defaultValue={currentQuery}
            placeholder="Cerca chitarre, microfoni, marche…"
            aria-label="Cerca prodotti"
            className="h-9 rounded-none border-0 border-b border-input pr-0 pl-6 text-ellipsis focus-visible:border-primary focus-visible:ring-0"
          />
        </form>

        <Link
          to="/carrello"
          aria-label={count > 0 ? `Carrello, ${count} articoli` : "Carrello"}
          className="text-silk flex h-9 shrink-0 items-center gap-2 border border-foreground px-2.5 transition-colors hover:bg-foreground hover:text-background"
        >
          <ShoppingCart className="size-4" aria-hidden />
          <span className="hidden md:inline">Carrello</span>
          {count > 0 && (
            <span className="bg-signal px-1.5 text-signal-foreground tabular-nums">{count}</span>
          )}
        </Link>
      </div>
    </header>
  );
}
