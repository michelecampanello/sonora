import { useState, type FormEvent, type ComponentProps } from "react";
import { Link, Navigate, useNavigate } from "react-router";
import { OrderTotals } from "@/components/cart/OrderTotals";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { clearCart, useCartLines } from "@/hooks/useCart";
import { ApiError, ordersPath, postJson } from "@/lib/api";
import { formatPrice } from "@/lib/format";
import type { OrderConfirmation, OrderCustomer } from "@/lib/types";

function Field({ label, name, className, ...props }: ComponentProps<typeof Input> & { label: string; name: string }) {
  return (
    <div className={`flex flex-col gap-1.5 ${className ?? ""}`}>
      <Label htmlFor={name}>{label}</Label>
      <Input id={name} name={name} required {...props} />
    </div>
  );
}

export function CheckoutPage() {
  const navigate = useNavigate();
  const { lines, count, total, error, loading, hasStockProblems } = useCartLines();
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<{ message: string; stock: boolean }>();
  const [placed, setPlaced] = useState(false);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const field = (name: keyof OrderCustomer) => String(data.get(name) ?? "").trim();

    setSubmitting(true);
    setSubmitError(undefined);
    try {
      const order = await postJson<OrderConfirmation>(ordersPath, {
        customer: {
          name: field("name"),
          email: field("email"),
          address: field("address"),
          city: field("city"),
          postal_code: field("postal_code"),
          province: field("province"),
        },
        items: lines.map(({ product, quantity }) => ({ productId: product.id, quantity })),
      });
      // "placed" evita che, svuotando il carrello, si veda per un attimo il rimando al carrello vuoto
      setPlaced(true);
      clearCart();
      navigate("/ordine-confermato", { replace: true, state: { order } });
    } catch (err) {
      setSubmitError({
        message: err instanceof Error ? err.message : "Errore imprevisto",
        stock: err instanceof ApiError && err.status === 409,
      });
      setSubmitting(false);
    }
  };

  if (placed) return null;
  if (count === 0 || hasStockProblems) return <Navigate to="/carrello" replace />;

  if (error) {
    return (
      <div className="rounded-lg border border-destructive/50 p-6 text-center">
        <p className="font-medium">Non è stato possibile caricare il carrello.</p>
        <p className="text-sm text-muted-foreground">{error}</p>
      </div>
    );
  }

  if (loading) return <Skeleton className="h-96 w-full" />;

  return (
    <div className="flex flex-col gap-6">
      <title>Checkout — Sonora</title>
      <h1 className="text-2xl font-semibold tracking-tight">Checkout</h1>

      <div className="grid items-start gap-6 lg:grid-cols-[1fr_380px] lg:gap-10">
        <form id="checkout" onSubmit={submit} className="flex flex-col gap-8">
          <section aria-labelledby="contact-title" className="flex flex-col gap-4">
            <h2 id="contact-title" className="font-semibold">
              Dati di contatto
            </h2>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Nome e cognome" name="name" autoComplete="name" minLength={2} maxLength={100} />
              <Field label="Email" name="email" type="email" autoComplete="email" maxLength={255} />
            </div>
          </section>

          <section aria-labelledby="shipping-title" className="flex flex-col gap-4">
            <h2 id="shipping-title" className="font-semibold">
              Indirizzo di spedizione
            </h2>
            <Field label="Indirizzo" name="address" autoComplete="street-address" minLength={3} maxLength={200} />
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-[1fr_2fr_1fr]">
              <Field
                label="CAP"
                name="postal_code"
                autoComplete="postal-code"
                inputMode="numeric"
                pattern="[0-9]{5}"
                maxLength={5}
                title="5 cifre"
              />
              <Field
                label="Città"
                name="city"
                autoComplete="address-level2"
                minLength={2}
                maxLength={100}
                className="col-span-2 row-start-2 sm:col-span-1 sm:row-start-auto"
              />
              <Field
                label="Provincia"
                name="province"
                autoComplete="address-level1"
                pattern="[A-Za-z]{2}"
                maxLength={2}
                title="2 lettere, es. MI"
                className="[&_input]:uppercase"
              />
            </div>
          </section>

          <section aria-labelledby="payment-title" className="flex flex-col gap-2">
            <h2 id="payment-title" className="font-semibold">
              Pagamento
            </h2>
            <p className="rounded-lg border p-3 text-sm">
              <span className="font-medium">Pagamento alla consegna.</span>{" "}
              <span className="text-muted-foreground">Paghi il corriere quando ricevi il pacco.</span>
            </p>
          </section>
        </form>

        <Card>
          <CardContent className="flex flex-col gap-4">
            <h2 className="font-semibold">Il tuo ordine</h2>
            <ul className="flex flex-col gap-2 text-sm">
              {lines.map(({ product, quantity }) => (
                <li key={product.id} className="flex justify-between gap-3">
                  <span className="min-w-0">
                    {quantity} × {product.name}
                  </span>
                  <span className="shrink-0">{formatPrice(Number(product.price) * quantity)}</span>
                </li>
              ))}
            </ul>
            <OrderTotals total={total} />

            {submitError && (
              <div role="alert" className="text-sm text-destructive">
                <p>{submitError.message}</p>
                {submitError.stock && (
                  <Link to="/carrello" className="underline underline-offset-4">
                    Torna al carrello
                  </Link>
                )}
              </div>
            )}

            <Button type="submit" form="checkout" size="lg" disabled={submitting}>
              {submitting ? "Invio dell'ordine…" : "Conferma ordine"}
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
