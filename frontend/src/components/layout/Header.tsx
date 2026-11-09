import type { FormEvent } from "react";
import { Link, useNavigate, useSearchParams } from "react-router";
import { AudioWaveform, Search, ShoppingCart } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useCart } from "@/hooks/useCart";

const NAV_LINK = "text-sm font-medium text-muted-foreground hover:text-foreground";

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
    <header className="sticky top-0 z-10 border-b bg-background/95 backdrop-blur">
      <div className="mx-auto flex min-h-16 max-w-7xl flex-wrap items-center gap-x-4 gap-y-1 px-4 py-2 sm:flex-nowrap sm:py-0">
        <Link to="/" className="flex shrink-0 items-center gap-2 text-xl font-semibold tracking-tight">
          <AudioWaveform className="size-6 text-primary" aria-hidden />
          Sonora
        </Link>

        {/* Su mobile i link vanno su una seconda riga, per lasciare spazio alla ricerca */}
        <nav aria-label="Principale" className="order-last flex w-full shrink-0 gap-4 sm:order-none sm:w-auto">
          <Link to="/catalogo" className={NAV_LINK}>
            Catalogo
          </Link>
          <Link to="/categorie" className={NAV_LINK}>
            Categorie
          </Link>
        </nav>

        <form onSubmit={search} role="search" className="relative ml-auto min-w-0 max-w-md flex-1">
          <Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
          {/* key: se la ricerca nell'URL cambia (es. torni indietro), il campo si aggiorna */}
          <Input
            key={currentQuery}
            name="q"
            type="search"
            defaultValue={currentQuery}
            placeholder="Cerca chitarre, microfoni, marche…"
            aria-label="Cerca prodotti"
            className="pl-8"
          />
        </form>

        <Button
          variant="ghost"
          size="icon"
          className="relative"
          nativeButton={false}
          render={<Link to="/carrello" />}
          aria-label={count > 0 ? `Carrello, ${count} articoli` : "Carrello"}
        >
          <ShoppingCart />
          {count > 0 && (
            <Badge className="absolute -top-1 -right-1 h-4 min-w-4 px-1 text-[0.625rem]">{count}</Badge>
          )}
        </Button>
      </div>
    </header>
  );
}
