import { useState, type FormEvent } from "react";
import { useSearchParams } from "react-router";
import { AccountSection, EmptyState, ListSkeleton, LoadError } from "@/components/account/AccountParts";
import { Pagination } from "@/components/catalog/Pagination";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useFetch } from "@/hooks/useFetch";
import { adminProductPath, adminProductsPath, sendJson } from "@/lib/api";
import type { AdminProduct, Paginated } from "@/lib/types";

type Editable = Pick<AdminProduct, "price" | "stock" | "active" | "featured">;

/** Una riga modificabile: invia solo i campi cambiati */
function ProductRow({ initial }: { initial: AdminProduct }) {
  const [saved, setSaved] = useState(initial);
  const [draft, setDraft] = useState<Editable>(initial);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string>();

  const changes = (Object.keys(draft) as (keyof Editable)[]).filter((key) => draft[key] !== saved[key]);
  const label = (field: string) => `${field} di ${saved.name}`;

  const save = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSaving(true);
    setError(undefined);
    try {
      const body = Object.fromEntries(changes.map((key) => [key, draft[key]]));
      const product = await sendJson<AdminProduct>("PATCH", adminProductPath(saved.id), body);
      setSaved(product);
      setDraft(product);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Errore imprevisto");
    } finally {
      setSaving(false);
    }
  };

  return (
    <li className="border-b py-3">
      <form onSubmit={save} className="grid items-center gap-3 md:grid-cols-[minmax(0,1fr)_7rem_6rem_auto_auto_6rem]">
        <div className="min-w-0">
          <p className={saved.active ? "font-medium" : "font-medium text-muted-foreground line-through"}>{saved.name}</p>
          <p className="text-sm text-muted-foreground">
            {saved.sku} · {saved.brand} · {saved.category}
          </p>
        </div>
        <Input
          aria-label={label("Prezzo")}
          inputMode="decimal"
          value={draft.price}
          onChange={(e) => setDraft({ ...draft, price: e.target.value.replace(",", ".") })}
        />
        <Input
          aria-label={label("Magazzino")}
          type="number"
          min={0}
          step={1}
          value={draft.stock}
          onChange={(e) => setDraft({ ...draft, stock: e.target.valueAsNumber })}
        />
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={draft.active} onChange={(e) => setDraft({ ...draft, active: e.target.checked })} />
          In vendita
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={draft.featured} onChange={(e) => setDraft({ ...draft, featured: e.target.checked })} />
          In evidenza
        </label>
        <Button type="submit" size="sm" disabled={saving || changes.length === 0} aria-label={label("Salva")}>
          Salva
        </Button>
      </form>
      {error && (
        <p role="alert" className="mt-2 text-sm text-destructive">
          {error}
        </p>
      )}
    </li>
  );
}

export function AdminProductsPage() {
  const [params, setParams] = useSearchParams();
  const q = params.get("q") ?? "";
  const lowStock = params.get("lowStock") === "true";
  const requested = Number(params.get("page"));
  const page = Number.isSafeInteger(requested) && requested > 0 ? requested : 1;
  const { data, error } = useFetch<Paginated<AdminProduct>>(adminProductsPath({ q, lowStock, page }));

  const update = (changes: { q?: string; lowStock?: boolean; page?: number }) => {
    const next = { q, lowStock, page: 1, ...changes };
    const search = new URLSearchParams();
    if (next.q) search.set("q", next.q);
    if (next.lowStock) search.set("lowStock", "true");
    if (next.page > 1) search.set("page", String(next.page));
    setParams(search);
  };

  const search = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    update({ q: String(new FormData(event.currentTarget).get("q") ?? "").trim() });
  };

  return (
    <AccountSection title="Prodotti">
      <div className="flex flex-wrap items-center gap-4">
        <form role="search" onSubmit={search} className="flex min-w-0 flex-1 gap-2">
          <Input key={q} name="q" type="search" defaultValue={q} placeholder="Nome o codice articolo" aria-label="Cerca prodotti" />
          <Button type="submit" variant="outline">
            Cerca
          </Button>
        </form>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={lowStock} onChange={(e) => update({ lowStock: e.target.checked })} />
          Solo quasi esauriti
        </label>
      </div>

      {error ? (
        <LoadError message={error} />
      ) : !data ? (
        <ListSkeleton />
      ) : data.total === 0 ? (
        <EmptyState>Nessun prodotto trovato.</EmptyState>
      ) : (
        <>
          <ul className="border-t">
            {data.items.map((product) => (
              // key con i dati: se la lista viene ricaricata, la riga riparte dai valori del server
              <ProductRow key={`${product.id}:${product.price}:${product.stock}:${product.active}:${product.featured}`} initial={product} />
            ))}
          </ul>
          <Pagination page={data.page} pages={data.pages} onChange={(next) => update({ page: next })} />
        </>
      )}
    </AccountSection>
  );
}
