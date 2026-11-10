import { useState, type FormEvent } from "react";
import { CreditCard } from "lucide-react";
import {
  AccountSection,
  DefaultMark,
  DeleteButton,
  EmptyState,
  FormError,
  ListSkeleton,
  LoadError,
} from "@/components/account/AccountParts";
import { FormField } from "@/components/FormField";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import { useAccountList } from "@/hooks/useAccountList";
import { paymentMethodPath, paymentMethodsPath, sendJson } from "@/lib/api";
import { CARD_BRANDS, type PaymentMethod } from "@/lib/types";

const isExpired = ({ exp_month, exp_year }: PaymentMethod) => {
  const now = new Date();
  return exp_year < now.getFullYear() || (exp_year === now.getFullYear() && exp_month < now.getMonth() + 1);
};

export function PaymentMethodsPage() {
  const { items, error, actionError, busy, run } = useAccountList<PaymentMethod>(paymentMethodsPath);
  const [adding, setAdding] = useState(false);
  const currentYear = new Date().getFullYear();

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const field = (name: string) => String(data.get(name) ?? "").trim();
    const saved = await run(() =>
      sendJson<PaymentMethod[]>("POST", paymentMethodsPath, {
        brand: field("brand"),
        last4: field("last4"),
        holder: field("holder"),
        exp_month: Number(field("exp_month")),
        exp_year: Number(field("exp_year")),
      })
    );
    if (saved) setAdding(false);
  };

  return (
    <AccountSection
      title="Pagamenti"
      action={
        <Button variant="outline" onClick={() => setAdding(true)}>
          Aggiungi carta
        </Button>
      }
    >
      <p className="max-w-2xl text-sm text-muted-foreground">
        Per ora il negozio accetta solo il pagamento alla consegna: le carte salvate qui non vengono addebitate. Salviamo
        soltanto circuito, ultime 4 cifre, intestatario e scadenza. Non inserire mai il numero completo o il codice di sicurezza.
      </p>

      {adding && (
        <form onSubmit={(event) => void submit(event)} autoComplete="off" className="panel flex flex-col gap-4 p-4 md:p-6">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="brand">Circuito</Label>
              <NativeSelect id="brand" name="brand" className="w-full" defaultValue="visa">
                {Object.entries(CARD_BRANDS).map(([value, label]) => (
                  <NativeSelectOption key={value} value={value}>
                    {label}
                  </NativeSelectOption>
                ))}
              </NativeSelect>
            </div>
            <FormField label="Ultime 4 cifre" name="last4" inputMode="numeric" pattern="[0-9]{4}" minLength={4} maxLength={4} title="4 cifre" autoComplete="off" />
          </div>
          <FormField label="Intestatario" name="holder" minLength={2} maxLength={100} autoComplete="off" />
          <div className="grid grid-cols-2 gap-4">
            <FormField label="Mese di scadenza" name="exp_month" type="number" min={1} max={12} autoComplete="off" />
            <FormField label="Anno di scadenza" name="exp_year" type="number" min={currentYear} max={currentYear + 20} placeholder={String(currentYear + 2)} autoComplete="off" />
          </div>
          <FormError message={actionError} />
          <div className="flex gap-3">
            <Button type="submit" disabled={busy}>
              Salva carta
            </Button>
            <Button type="button" variant="outline" onClick={() => setAdding(false)}>
              Annulla
            </Button>
          </div>
        </form>
      )}
      {!adding && <FormError message={actionError} />}

      {error ? (
        <LoadError message={error} />
      ) : !items ? (
        <ListSkeleton />
      ) : items.length === 0 ? (
        !adding && <EmptyState>Non hai ancora salvato metodi di pagamento.</EmptyState>
      ) : (
        <ul className="border-t">
          {items.map((method) => (
            <li key={method.id} className="flex flex-wrap items-center justify-between gap-3 border-b py-4">
              <div className="flex min-w-0 items-center gap-4 text-sm">
                <CreditCard className="size-6 shrink-0 text-muted-foreground" strokeWidth={1.25} aria-hidden />
                <div className="min-w-0">
                  <p className="flex flex-wrap items-center gap-x-3 font-medium">
                    {CARD_BRANDS[method.brand]} •••• {method.last4}
                    {method.is_default && <DefaultMark />}
                  </p>
                  <p className="text-muted-foreground">
                    {method.holder} · {isExpired(method) ? "Scaduta il" : "Scade il"} {String(method.exp_month).padStart(2, "0")}/{method.exp_year}
                  </p>
                </div>
              </div>
              <div className="flex flex-wrap gap-1">
                {!method.is_default && (
                  <Button variant="ghost" size="sm" disabled={busy} onClick={() => void run(() => sendJson<PaymentMethod[]>("POST", `${paymentMethodPath(method.id)}/default`))}>
                    Rendi predefinita
                  </Button>
                )}
                <DeleteButton
                  what="questa carta"
                  disabled={busy}
                  onConfirm={() => void run(() => sendJson<PaymentMethod[]>("DELETE", paymentMethodPath(method.id)))}
                />
              </div>
            </li>
          ))}
        </ul>
      )}
    </AccountSection>
  );
}
