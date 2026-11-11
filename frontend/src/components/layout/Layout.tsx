import { Link, Outlet } from "react-router";
import { Header } from "./Header";

const FOOTER_LINK = "transition-colors hover:text-signal";

export function Layout() {
  return (
    <div className="flex min-h-svh flex-col overflow-x-clip">
      <Header />
      <main className="mx-auto w-full max-w-[96rem] flex-1 px-4 py-8 md:px-8 md:py-12">
        <Outlet />
      </main>
      <footer className="panel mt-12 overflow-hidden">
        <div className="ticks text-muted-foreground/50" aria-hidden />
        <div className="mx-auto flex max-w-[96rem] flex-col gap-8 px-4 pt-8 md:px-8">
          <div className="text-silk flex flex-wrap justify-between gap-x-8 gap-y-3 text-muted-foreground">
            <p>Sonora — progetto portfolio. Prodotti e marche sono di fantasia.</p>
            <nav aria-label="Piè di pagina" className="flex gap-5">
              <Link to="/catalogo" className={FOOTER_LINK}>
                Catalogo
              </Link>
              <Link to="/categorie" className={FOOTER_LINK}>
                Categorie
              </Link>
              <Link to="/carrello" className={FOOTER_LINK}>
                Carrello
              </Link>
            </nav>
          </div>
          {/* Il marchio gigante è tagliato dal bordo inferiore, come un adesivo sul flight case */}
          <p aria-hidden className="text-display -mb-[0.14em] text-center text-[min(29vw,30rem)] leading-[0.74] whitespace-nowrap">
            Sonora
          </p>
        </div>
      </footer>
    </div>
  );
}
