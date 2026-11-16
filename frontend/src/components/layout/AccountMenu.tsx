import { useState } from "react"
import { Link, useLocation, useNavigate } from "react-router"
import {
  ChevronDown,
  LayoutDashboard,
  LogOut,
  MapPin,
  Package,
  Settings2,
  type LucideIcon,
} from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuLinkItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { logout } from "@/hooks/useAuth"
import { fullName, greeting } from "@/lib/format"
import type { User as UserData } from "@/lib/types"

type MenuLink = readonly [to: string, label: string, icon: LucideIcon]

export const ACCOUNT_LINKS: readonly MenuLink[] = [
  ["/account/ordini", "Ordini", Package],
  ["/account/indirizzi", "Indirizzi", MapPin],
  ["/account/impostazioni", "Impostazioni", Settings2],
]

/** In cima al menu, solo per gli admin: il pannello di gestione del negozio */
const ADMIN_LINK: MenuLink = ["/admin", "Dashboard", LayoutDashboard]

/** Le iniziali di nome e cognome, come l'etichetta di un canale sul mixer: "GB" */
function initials(user: UserData): string {
  const letters = [user.first_name, user.last_name]
    .map((part) => part.trim().charAt(0))
    .join("")
  return (letters || user.email.charAt(0)).toUpperCase()
}

const ITEM = "gap-3 rounded-none px-3 py-2 cursor-pointer"

/** Il menu a tendina dell'utente collegato, nell'header: le sezioni dell'area personale e l'uscita */
export function AccountMenu({ user }: { user: UserData }) {
  const location = useLocation()
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)
  const [logoutFailed, setLogoutFailed] = useState(false)
  const links =
    user.role === "admin" ? [ADMIN_LINK, ...ACCOUNT_LINKS] : ACCOUNT_LINKS

  const signOut = () => {
    setLogoutFailed(false)
    logout().then(
      () => {
        setOpen(false)
        // Dalla home e non dalla pagina attuale: restando su /account si finirebbe al login
        navigate("/")
      },
      () => setLogoutFailed(true)
    )
  }

  return (
    <DropdownMenu
      open={open}
      onOpenChange={(next) => {
        setOpen(next)
        if (next) setLogoutFailed(false)
      }}
    >
      <DropdownMenuTrigger
        aria-label={`Il mio account, ${fullName(user)}`}
        className="group/account flex h-9 shrink-0 items-center gap-2 text-silk transition-colors outline-none hover:text-primary focus-visible:text-primary data-popup-open:text-primary"
      >
        {/* Bordato come il pulsante del carrello; pieno quando il menu è aperto */}
        <span
          aria-hidden
          className="flex size-7 items-center justify-center border border-current font-mono text-[0.625rem] tracking-normal transition-colors group-data-popup-open/account:border-primary group-data-popup-open/account:bg-primary group-data-popup-open/account:text-primary-foreground"
        >
          {initials(user)}
        </span>
        <span className="hidden max-w-44 truncate lg:inline">
          {greeting(user.first_name)}
        </span>
        <ChevronDown
          className="size-3.5 transition-transform duration-150 group-data-popup-open/account:rotate-180"
          aria-hidden
        />
      </DropdownMenuTrigger>

      <DropdownMenuContent
        align="end"
        sideOffset={8}
        className="w-64 rounded-none p-0"
      >
        <DropdownMenuGroup>
          {/* La testata del menu è un pannello petrolio, come il footer, con la sua scala graduata */}
          <DropdownMenuLabel className="flex flex-col gap-1 panel px-3 pt-3 pb-0 text-sm">
            <span className="text-silk text-muted-foreground">
              Il tuo account
            </span>
            <span className="truncate text-display text-2xl text-foreground">
              {fullName(user)}
            </span>
            <span className="truncate font-normal text-muted-foreground">
              {user.email}
            </span>
            <span aria-hidden className="mt-2 ticks text-muted-foreground/50" />
          </DropdownMenuLabel>

          <div className="py-1">
            {links.map(([to, label, Icon]) => {
              const current =
                location.pathname === to ||
                location.pathname.startsWith(`${to}/`)
              return (
                <DropdownMenuLinkItem
                  key={to}
                  render={<Link to={to} />}
                  aria-current={current ? "page" : undefined}
                  className={ITEM}
                >
                  <Icon className="text-muted-foreground" aria-hidden />
                  {label}
                  {/* Il LED della sezione in cui ci si trova */}
                  {current && (
                    <span
                      aria-hidden
                      className="ml-auto size-1.5 rounded-full bg-signal"
                    />
                  )}
                </DropdownMenuLinkItem>
              )
            })}
          </div>
        </DropdownMenuGroup>

        <DropdownMenuSeparator className="mx-0 my-0" />

        <div className="py-1">
          {/* closeOnClick false: se l'uscita non riesce, il menu resta aperto e mostra l'errore */}
          <DropdownMenuItem
            variant="destructive"
            closeOnClick={false}
            onClick={signOut}
            className={ITEM}
          >
            <LogOut aria-hidden />
            {logoutFailed ? "Uscita non riuscita, riprova" : "Esci"}
          </DropdownMenuItem>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
