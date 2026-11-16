import { type SubmitEvent } from "react"
import {
  Link,
  NavLink,
  useLocation,
  useNavigate,
  useSearchParams,
} from "react-router"
import { Search, ShoppingCart, User } from "lucide-react"
import { Input } from "@/components/ui/input"
import { useAuth } from "@/hooks/useAuth"
import { useCart } from "@/hooks/useCart"
import { AccountMenu } from "./AccountMenu"
import { LevelMark } from "./LevelMark"
import { ThemeToggle } from "./ThemeToggle"

const NAV_LINK =
  "text-silk border-b-2 border-transparent py-1 text-muted-foreground transition-colors hover:text-foreground aria-[current=page]:border-signal aria-[current=page]:text-foreground"

const LINKS = [
  { href: "/catalogo", tag: "Catalogo" },
  { href: "/categorie", tag: "Categorie" },
  { href: "/chi-siamo", tag: "Chi Siamo" },
]

export function Header() {
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const currentQuery = params.get("q") ?? ""
  const { count } = useCart()
  const { user, loading } = useAuth()
  const location = useLocation()

  const search = (event: SubmitEvent<HTMLFormElement>) => {
    event.preventDefault()
    const q = String(new FormData(event.currentTarget).get("q") ?? "").trim()
    navigate(q ? `/catalogo?q=${encodeURIComponent(q)}` : "/catalogo")
  }

  return (
    <header className="sticky top-0 z-20 border-b bg-background/95 backdrop-blur-md">
      {/*
        Su telefono: logo e pulsanti, poi i link, poi la ricerca a tutta larghezza.
        Da sm i link salgono sulla prima riga; da lg anche la ricerca, tra i link e i pulsanti.
      */}
      <div className="mx-auto flex min-h-16 max-w-384 flex-wrap items-center gap-x-6 gap-y-2 px-4 py-2 md:px-8 lg:flex-nowrap lg:py-0">
        <Link to="/" className="order-1 flex shrink-0 items-center gap-2">
          <LevelMark className="text-primary" />
          {/* Sugli schermi piccoli resta solo il marchio: il nome serve comunque ai lettori di schermo */}
          <span className="sr-only text-display text-3xl md:not-sr-only">
            Sonora
          </span>
        </Link>

        <nav
          aria-label="Principale"
          className="order-3 flex w-full shrink-0 gap-5 sm:order-2 sm:w-auto"
        >
          {LINKS.map((link) => (
            <NavLink key={link.href} to={link.href} className={NAV_LINK}>
              {link.tag}
            </NavLink>
          ))}
          {user?.role === "admin" && (
            <NavLink to="/admin" className={NAV_LINK}>
              Admin
            </NavLink>
          )}
        </nav>

        <form
          onSubmit={search}
          role="search"
          className="relative order-4 w-full min-w-0 lg:order-3 lg:ml-auto lg:w-auto lg:max-w-md lg:flex-1"
        >
          <Search
            className="pointer-events-none absolute top-1/2 left-0 size-4 -translate-y-1/2 text-muted-foreground"
            aria-hidden
          />
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

        <div className="order-2 ml-auto flex shrink-0 items-center gap-x-4 sm:order-3 sm:gap-x-6 lg:order-4 lg:ml-0">
          <ThemeToggle />
          {user && <AccountMenu user={user} />}
          {!user && !loading && (
            <Link
              to="/accedi"
              state={{ from: `${location.pathname}${location.search}` }}
              aria-label="Accedi"
              className="flex h-9 shrink-0 items-center gap-2 text-silk transition-colors hover:text-primary"
            >
              <User className="size-4" aria-hidden />
              <span className="hidden md:inline">Accedi</span>
            </Link>
          )}

          <Link
            to="/carrello"
            aria-label={count > 0 ? `Carrello, ${count} articoli` : "Carrello"}
            className="flex h-9 shrink-0 items-center gap-2 border border-foreground px-2.5 text-silk transition-colors hover:bg-foreground hover:text-background"
          >
            <ShoppingCart className="size-4" aria-hidden />
            <span className="hidden md:inline">Carrello</span>
            {count > 0 && (
              <span className="bg-signal px-1.5 text-signal-foreground tabular-nums">
                {count}
              </span>
            )}
          </Link>
        </div>
      </div>
    </header>
  )
}
