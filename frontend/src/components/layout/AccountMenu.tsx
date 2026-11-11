import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router";
import { ChevronDown, LogOut, User } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuLinkItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { logout } from "@/hooks/useAuth";
import type { User as UserData } from "@/lib/types";

export const ACCOUNT_LINKS = [
  ["/account/ordini", "Ordini"],
  ["/account/indirizzi", "Indirizzi"],
  ["/account/pagamenti", "Pagamenti"],
  ["/account/impostazioni", "Impostazioni"],
] as const;

/** Il menu a tendina dell'utente collegato, nell'header: le sezioni dell'area personale e l'uscita */
export function AccountMenu({ user }: { user: UserData }) {
  const location = useLocation();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [logoutFailed, setLogoutFailed] = useState(false);

  const signOut = () => {
    setLogoutFailed(false);
    logout().then(
      () => {
        setOpen(false);
        // Dalla home e non dalla pagina attuale: restando su /account si finirebbe al login
        navigate("/");
      },
      () => setLogoutFailed(true),
    );
  };

  return (
    <DropdownMenu
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (next) setLogoutFailed(false);
      }}
    >
      <DropdownMenuTrigger
        aria-label={`Il mio account, ${user.name}`}
        className="flex h-9 shrink-0 items-center gap-2 text-silk transition-colors outline-none hover:text-primary focus-visible:text-primary data-popup-open:text-primary"
      >
        <User className="size-4" aria-hidden />
        <span className="hidden max-w-40 truncate lg:inline">{user.name}</span>
        <ChevronDown className="size-3.5" aria-hidden />
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuGroup>
          <DropdownMenuLabel className="truncate">{user.email}</DropdownMenuLabel>
          {ACCOUNT_LINKS.map(([to, label]) => {
            const current = location.pathname === to || location.pathname.startsWith(`${to}/`);
            return (
              <DropdownMenuLinkItem key={to} render={<Link to={to} />} aria-current={current ? "page" : undefined}>
                {label}
              </DropdownMenuLinkItem>
            );
          })}
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        {/* closeOnClick false: se l'uscita non riesce, il menu resta aperto e mostra l'errore */}
        <DropdownMenuItem variant="destructive" closeOnClick={false} onClick={signOut}>
          <LogOut aria-hidden />
          {logoutFailed ? "Uscita non riuscita, riprova" : "Esci"}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
