import { useState, type FormEvent, type ReactNode } from "react";
import { Link, useLocation, useNavigate, useParams } from "react-router";
import { ArrowDown, ArrowUp, Plus, Trash2 } from "lucide-react";
import { AccountSection, FormError, ListSkeleton, LoadError } from "@/components/account/AccountParts";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect, NativeSelectOptGroup, NativeSelectOption } from "@/components/ui/native-select";
import { Textarea } from "@/components/ui/textarea";
import { useFetch } from "@/hooks/useFetch";
import { adminNewProductPath, adminProductPath, brandsPath, categoriesPath, sendJson } from "@/lib/api";
import type { AdminProductDetail, Brand, Category, ProductInput } from "@/lib/types";

/** Nel form prezzo e magazzino sono testo: si convertono solo all'invio */
interface Draft extends Omit<ProductInput, "price" | "stock" | "description" | "images"> {
  price: string;
  stock: string;
  description: string;
  images: { url: string; alt: string }[];
}

const EMPTY: Draft = {
  sku: "",
  name: "",
  description: "",
  price: "",
  stock: "0",
  active: true,
  featured: false,
  category_id: "",
  brand_id: "",
  specs: [],
  images: [],
};

const toDraft = (product: AdminProductDetail): Draft => ({
  sku: product.sku,
  name: product.name,
  description: product.description ?? "",
  price: product.price,
  stock: String(product.stock),
  active: product.active,
  featured: product.featured,
  category_id: product.category_id,
  brand_id: product.brand_id,
  specs: product.specs,
  images: product.images.map((image) => ({ url: image.url, alt: image.alt ?? "" })),
});

const toInput = (draft: Draft) => ({
  ...draft,
  price: draft.price.replace(",", "."),
  // Un campo vuoto diventa NaN: arriva al server come null e il server risponde con l'errore giusto
  stock: Number(draft.stock === "" ? Number.NaN : draft.stock),
});

/** Sposta l'elemento i di una posizione (-1 su, +1 giù) */
function move<T>(list: T[], i: number, step: -1 | 1): T[] {
  const j = i + step;
  if (j < 0 || j >= list.length) return list;
  const next = [...list];
  [next[i], next[j]] = [next[j]!, next[i]!];
  return next;
}

function Field({ id, label, hint, children }: { id: string; label: string; hint?: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <Label htmlFor={id}>{label}</Label>
      {children}
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}

function ProductForm({ product, categories, brands }: { product?: AdminProductDetail; categories: Category[]; brands: Brand[] }) {
  const navigate = useNavigate();
  const location = useLocation();
  const [draft, setDraft] = useState<Draft>(product ? toDraft(product) : EMPTY);
  const [saved, setSaved] = useState(product);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string>();
  const [notice, setNotice] = useState<string | undefined>((location.state as { notice?: string } | null)?.notice);

  const set = <K extends keyof Draft>(key: K, value: Draft[K]) => {
    setDraft((current) => ({ ...current, [key]: value }));
    setNotice(undefined);
  };

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSaving(true);
    setError(undefined);
    try {
      if (saved) {
        const updated = await sendJson<AdminProductDetail>("PUT", adminProductPath(saved.id), toInput(draft));
        setSaved(updated);
        setDraft(toDraft(updated));
        setNotice("Modifiche salvate.");
      } else {
        const created = await sendJson<AdminProductDetail>("POST", adminNewProductPath, toInput(draft));
        navigate(`/admin/prodotti/${created.id}`, { replace: true, state: { notice: "Prodotto creato." } });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Errore imprevisto");
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={submit} className="flex flex-col gap-8">
      {notice && (
        <p role="status" className="border border-border p-3 text-sm">
          {notice}
        </p>
      )}

      <fieldset className="grid gap-4 md:grid-cols-2">
        <legend className="text-silk mb-3 text-muted-foreground">Dati principali</legend>
        <Field id="name" label="Nome" hint={saved ? `Indirizzo nel negozio: /prodotti/${saved.slug} (non cambia se rinomini)` : undefined}>
          <Input id="name" required minLength={2} maxLength={200} value={draft.name} onChange={(e) => set("name", e.target.value)} />
        </Field>
        <Field id="sku" label="Codice articolo" hint="Lettere, cifre e trattini, es. SON-0123">
          <Input id="sku" required maxLength={32} value={draft.sku} onChange={(e) => set("sku", e.target.value.toUpperCase())} />
        </Field>
        <Field id="category" label="Categoria">
          <NativeSelect id="category" required className="w-full" value={draft.category_id} onChange={(e) => set("category_id", e.target.value)}>
            <NativeSelectOption value="" disabled>
              Scegli…
            </NativeSelectOption>
            {categories.map((parent) => (
              <NativeSelectOptGroup key={parent.id} label={parent.name}>
                <NativeSelectOption value={parent.id}>{parent.name} (generale)</NativeSelectOption>
                {parent.children.map((child) => (
                  <NativeSelectOption key={child.id} value={child.id}>
                    {child.name}
                  </NativeSelectOption>
                ))}
              </NativeSelectOptGroup>
            ))}
          </NativeSelect>
        </Field>
        <Field id="brand" label="Marca">
          <NativeSelect id="brand" required className="w-full" value={draft.brand_id} onChange={(e) => set("brand_id", e.target.value)}>
            <NativeSelectOption value="" disabled>
              Scegli…
            </NativeSelectOption>
            {brands.map((brand) => (
              <NativeSelectOption key={brand.id} value={brand.id}>
                {brand.name}
              </NativeSelectOption>
            ))}
          </NativeSelect>
        </Field>
        <Field id="price" label="Prezzo (€)">
          <Input id="price" required inputMode="decimal" value={draft.price} onChange={(e) => set("price", e.target.value)} />
        </Field>
        <Field id="stock" label="Pezzi in magazzino">
          <Input id="stock" required type="number" min={0} step={1} value={draft.stock} onChange={(e) => set("stock", e.target.value)} />
        </Field>
        <div className="md:col-span-2">
          <Field id="description" label="Descrizione">
            <Textarea id="description" rows={5} maxLength={5000} value={draft.description} onChange={(e) => set("description", e.target.value)} />
          </Field>
        </div>
        <div className="flex flex-wrap gap-6 md:col-span-2">
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={draft.active} onChange={(e) => set("active", e.target.checked)} />
            In vendita nel negozio
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={draft.featured} onChange={(e) => set("featured", e.target.checked)} />
            In evidenza nella home
          </label>
        </div>
      </fieldset>

      <fieldset className="flex flex-col gap-3">
        <legend className="text-silk mb-3 text-muted-foreground">Caratteristiche tecniche</legend>
        {draft.specs.map((spec, i) => (
          <div key={i} className="grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto] gap-2">
            <Input
              aria-label={`Nome caratteristica ${i + 1}`}
              placeholder="es. Corde"
              required
              maxLength={100}
              value={spec.label}
              onChange={(e) => set("specs", draft.specs.map((s, j) => (j === i ? { ...s, label: e.target.value } : s)))}
            />
            <Input
              aria-label={`Valore caratteristica ${i + 1}`}
              placeholder="es. 6"
              required
              maxLength={200}
              value={spec.value}
              onChange={(e) => set("specs", draft.specs.map((s, j) => (j === i ? { ...s, value: e.target.value } : s)))}
            />
            <Button
              type="button"
              variant="ghost"
              size="icon"
              aria-label={`Rimuovi caratteristica ${i + 1}`}
              onClick={() => set("specs", draft.specs.filter((_, j) => j !== i))}
            >
              <Trash2 />
            </Button>
          </div>
        ))}
        <Button type="button" variant="outline" className="self-start" onClick={() => set("specs", [...draft.specs, { label: "", value: "" }])}>
          <Plus /> Aggiungi caratteristica
        </Button>
      </fieldset>

      <fieldset className="flex flex-col gap-3">
        <legend className="text-silk mb-3 text-muted-foreground">Immagini</legend>
        <p className="text-sm text-muted-foreground">
          La prima è la copertina. Usa un percorso del sito (es. /prodotti/nome.svg) oppure un indirizzo https://. Senza immagini il
          negozio mostra un'illustrazione automatica.
        </p>
        {draft.images.map((image, i) => (
          <div key={i} className="grid grid-cols-[3rem_minmax(0,2fr)_minmax(0,1fr)_auto] items-center gap-2">
            {image.url ? (
              <img src={image.url} alt="" className="aspect-square w-12 rounded-md bg-muted object-cover" />
            ) : (
              <span className="aspect-square w-12 rounded-md bg-muted" />
            )}
            <Input
              aria-label={`Indirizzo immagine ${i + 1}`}
              required
              value={image.url}
              onChange={(e) => set("images", draft.images.map((img, j) => (j === i ? { ...img, url: e.target.value } : img)))}
            />
            <Input
              aria-label={`Testo alternativo immagine ${i + 1}`}
              placeholder="Descrizione per chi non vede l'immagine"
              maxLength={200}
              value={image.alt}
              onChange={(e) => set("images", draft.images.map((img, j) => (j === i ? { ...img, alt: e.target.value } : img)))}
            />
            <div className="flex">
              <Button type="button" variant="ghost" size="icon" aria-label={`Sposta su immagine ${i + 1}`} disabled={i === 0} onClick={() => set("images", move(draft.images, i, -1))}>
                <ArrowUp />
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                aria-label={`Sposta giù immagine ${i + 1}`}
                disabled={i === draft.images.length - 1}
                onClick={() => set("images", move(draft.images, i, 1))}
              >
                <ArrowDown />
              </Button>
              <Button type="button" variant="ghost" size="icon" aria-label={`Rimuovi immagine ${i + 1}`} onClick={() => set("images", draft.images.filter((_, j) => j !== i))}>
                <Trash2 />
              </Button>
            </div>
          </div>
        ))}
        <Button type="button" variant="outline" className="self-start" onClick={() => set("images", [...draft.images, { url: "", alt: "" }])}>
          <Plus /> Aggiungi immagine
        </Button>
      </fieldset>

      <FormError message={error} />
      <div className="flex flex-wrap items-center gap-4 border-t pt-6">
        <Button type="submit" size="lg" disabled={saving}>
          {saved ? "Salva modifiche" : "Crea prodotto"}
        </Button>
        {saved?.active && (
          <Link to={`/prodotti/${saved.slug}`} className="text-silk underline underline-offset-4 hover:text-primary">
            Vedi nel negozio
          </Link>
        )}
      </div>
    </form>
  );
}

export function AdminProductFormPage() {
  const { id } = useParams();
  const product = useFetch<AdminProductDetail>(id ? adminProductPath(id) : null);
  const categories = useFetch<Category[]>(categoriesPath);
  const brands = useFetch<Brand[]>(brandsPath);

  const error = product.error ?? categories.error ?? brands.error;
  const ready = categories.data && brands.data && (!id || product.data);

  const backLink = (
    <Link to="/admin/prodotti" className="text-silk underline underline-offset-4 hover:text-primary">
      Tutti i prodotti
    </Link>
  );

  return (
    <AccountSection title={id ? (product.data?.name ?? "Prodotto") : "Nuovo prodotto"} action={backLink}>
      {error ? (
        <LoadError message={error} />
      ) : !ready ? (
        <ListSkeleton />
      ) : (
        // key: passando da un prodotto all'altro il form riparte dai dati giusti
        <ProductForm key={id ?? "nuovo"} product={product.data} categories={categories.data!} brands={brands.data!} />
      )}
    </AccountSection>
  );
}
