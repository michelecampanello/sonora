import type { ReactNode } from "react";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

/** Titolo e contenuto di una sezione dell'area personale */
export function AccountSection({ title, action, children }: { title: string; action?: ReactNode; children: ReactNode }) {
  return (
    <section className="flex min-w-0 flex-col gap-6">
      <title>{`${title} — Sonora`}</title>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <h1 className="text-display text-5xl md:text-7xl">{title}</h1>
        {action}
      </div>
      {children}
    </section>
  );
}

export const FormError = ({ message }: { message?: string | undefined }) =>
  message ? (
    <p role="alert" className="border border-signal p-3 text-sm text-signal">
      {message}
    </p>
  ) : null;

export const LoadError = ({ message }: { message: string }) => (
  <div className="rounded-lg border border-destructive/50 p-6 text-center">
    <p className="font-medium">Non è stato possibile caricare i dati.</p>
    <p className="text-sm text-muted-foreground">{message}</p>
  </div>
);

export const EmptyState = ({ children }: { children: ReactNode }) => (
  <p className="border border-dashed p-10 text-center text-muted-foreground">{children}</p>
);

export const ListSkeleton = () => (
  <div className="flex flex-col gap-3" aria-label="Caricamento">
    <Skeleton className="h-24 w-full" />
    <Skeleton className="h-24 w-full" />
  </div>
);

export const DefaultMark = () => (
  <span className="text-silk inline-flex items-center gap-1.5">
    <span aria-hidden className="size-1.5 rounded-full bg-led-ok" />
    Predefinito
  </span>
);

export function DeleteButton({ what, disabled, onConfirm }: { what: string; disabled: boolean; onConfirm: () => void }) {
  return (
    <AlertDialog>
      <AlertDialogTrigger render={<Button variant="ghost" size="sm" disabled={disabled} />}>Elimina</AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Eliminare {what}?</AlertDialogTitle>
          <AlertDialogDescription>L'operazione non si può annullare.</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Annulla</AlertDialogCancel>
          <AlertDialogCancel variant="destructive" onClick={onConfirm}>
            Elimina
          </AlertDialogCancel>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
