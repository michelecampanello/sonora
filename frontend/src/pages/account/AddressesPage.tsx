import { useState, type FormEvent } from "react";
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
import { useAccountList } from "@/hooks/useAccountList";
import { addressesPath, addressPath, sendJson } from "@/lib/api";
import type { Address } from "@/lib/types";

type AddressFields = Omit<Address, "id" | "is_default">;

interface AddressFormProps {
  initial?: Address | undefined;
  busy: boolean;
  error?: string | undefined;
  onSave: (fields: AddressFields) => void;
  onCancel: () => void;
}

function AddressForm({ initial, busy, error, onSave, onCancel }: AddressFormProps) {
  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const field = (name: keyof AddressFields) => String(data.get(name) ?? "").trim();
    onSave({
      name: field("name"),
      address: field("address"),
      city: field("city"),
      postal_code: field("postal_code"),
      province: field("province"),
    });
  };

  return (
    <form onSubmit={submit} className="panel flex flex-col gap-4 p-4 md:p-6">
      <FormField label="Destinatario" name="name" autoComplete="name" minLength={2} maxLength={100} defaultValue={initial?.name} />
      <FormField label="Indirizzo" name="address" autoComplete="street-address" minLength={3} maxLength={200} defaultValue={initial?.address} />
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-[1fr_2fr_1fr]">
        <FormField label="CAP" name="postal_code" autoComplete="postal-code" inputMode="numeric" pattern="[0-9]{5}" maxLength={5} title="5 cifre" defaultValue={initial?.postal_code} />
        <FormField label="Città" name="city" autoComplete="address-level2" minLength={2} maxLength={100} className="col-span-2 row-start-2 sm:col-span-1 sm:row-start-auto" defaultValue={initial?.city} />
        <FormField label="Provincia" name="province" autoComplete="address-level1" pattern="[A-Za-z]{2}" maxLength={2} title="2 lettere, es. MI" className="[&_input]:uppercase" defaultValue={initial?.province} />
      </div>
      <FormError message={error} />
      <div className="flex gap-3">
        <Button type="submit" disabled={busy}>
          Salva indirizzo
        </Button>
        <Button type="button" variant="outline" onClick={onCancel}>
          Annulla
        </Button>
      </div>
    </form>
  );
}

export function AddressesPage() {
  const { items, error, actionError, busy, run } = useAccountList<Address>(addressesPath);
  const [editing, setEditing] = useState<Address | "new" | null>(null);

  const save = async (fields: AddressFields) => {
    const saved = await run(() =>
      editing && editing !== "new"
        ? sendJson<Address[]>("PUT", addressPath(editing.id), fields)
        : sendJson<Address[]>("POST", addressesPath, fields)
    );
    if (saved) setEditing(null);
  };

  const form = editing && (
    <AddressForm
      key={editing === "new" ? "new" : editing.id}
      initial={editing === "new" ? undefined : editing}
      busy={busy}
      error={actionError}
      onSave={(fields) => void save(fields)}
      onCancel={() => setEditing(null)}
    />
  );

  return (
    <AccountSection
      title="Indirizzi"
      action={
        <Button variant="outline" onClick={() => setEditing("new")}>
          Aggiungi indirizzo
        </Button>
      }
    >
      {editing === "new" && form}
      {!editing && <FormError message={actionError} />}

      {error ? (
        <LoadError message={error} />
      ) : !items ? (
        <ListSkeleton />
      ) : items.length === 0 ? (
        editing !== "new" && <EmptyState>Non hai ancora salvato indirizzi.</EmptyState>
      ) : (
        <ul className="border-t">
          {items.map((address) =>
            editing !== "new" && editing?.id === address.id ? (
              <li key={address.id} className="border-b py-4">
                {form}
              </li>
            ) : (
              <li key={address.id} className="flex flex-wrap items-center justify-between gap-3 border-b py-4">
                <div className="min-w-0 text-sm">
                  <p className="flex flex-wrap items-center gap-x-3 font-medium">
                    {address.name}
                    {address.is_default && <DefaultMark />}
                  </p>
                  <p>{address.address}</p>
                  <p className="text-muted-foreground">
                    {address.postal_code} {address.city} ({address.province})
                  </p>
                </div>
                <div className="flex flex-wrap gap-1">
                  {!address.is_default && (
                    <Button variant="ghost" size="sm" disabled={busy} onClick={() => void run(() => sendJson<Address[]>("POST", `${addressPath(address.id)}/default`))}>
                      Rendi predefinito
                    </Button>
                  )}
                  <Button variant="ghost" size="sm" onClick={() => setEditing(address)}>
                    Modifica
                  </Button>
                  <DeleteButton
                    what="questo indirizzo"
                    disabled={busy}
                    onConfirm={() => void run(() => sendJson<Address[]>("DELETE", addressPath(address.id)))}
                  />
                </div>
              </li>
            )
          )}
        </ul>
      )}
    </AccountSection>
  );
}
