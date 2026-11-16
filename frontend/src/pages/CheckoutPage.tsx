import { useEffect, useRef, useState, type FormEvent, type ReactNode } from "react";
import { Link, Navigate, useNavigate, useSearchParams } from "react-router";
import { CreditCard, Truck } from "lucide-react";
import { OrderTotals } from "@/components/cart/OrderTotals";
import { FormField as Field } from "@/components/FormField";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/hooks/useAuth";
import { clearCart, useCartLines } from "@/hooks/useCart";
import { useFetch } from "@/hooks/useFetch";
import { addressesPath, ApiError, cancelPaymentPath, ordersPath, paymentOptionsPath, postJson } from "@/lib/api";
import { formatPrice, fullName } from "@/lib/format";
import { redirectTo } from "@/lib/redirect";
import type { Address, CardOrderStatus, OrderConfirmation, OrderCustomer, PaymentMethod } from "@/lib/types";
import { PageMeta } from "@/components/PageMeta";

export function CheckoutPage() {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { data: addresses } = useFetch<Address[]>(user ? addressesPath : null);
  const saved = addresses?.find((address) => address.is_default);
  const { lines, count, total, error, loading, hasStockProblems } = useCartLines();
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<{ message: string; stock: boolean }>();
  const [placed, setPlaced] = useState(false);
  const { data: paymentOptions } = useFetch<{ card: boolean }>(paymentOptionsPath);
  const cardAvailable = paymentOptions?.card === true;
  const [chosenMethod, setChosenMethod] = useState<PaymentMethod>();
  // La carta è proposta per prima quando c'è; finché non si sa, vale il pagamento alla consegna
  const paymentMethod: PaymentMethod = chosenMethod ?? (cardAvailable ? "card" : "cod");
  const returnNotice = useCancelledPayment();

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
        payment_method: paymentMethod,
      });
      if (order.checkout_url) {
        // Si paga sulla pagina di Stripe. Il carrello resta com'è: si svuota solo quando il pagamento è arrivato
        redirectTo(order.checkout_url);
        return;
      }
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
      <PageMeta title="Checkout" noindex />
      <h1 className="text-display text-6xl md:text-8xl">Checkout</h1>
      {returnNotice && (
        <p role="status" className="border border-signal p-3 text-sm">
          {returnNotice}
        </p>
      )}
      {!user && !authLoading && (
        <p className="text-sm text-muted-foreground">
          Hai un account?{" "}
          <Link to="/accedi" state={{ from: "/checkout" }} className="text-foreground underline underline-offset-4 hover:text-primary">
            Accedi
          </Link>{" "}
          per collegare l'ordine al tuo profilo, oppure continua come ospite.
        </p>
      )}

      <div className="grid items-start gap-6 lg:grid-cols-[1fr_380px] lg:gap-10">
        <form id="checkout" onSubmit={submit} className="flex flex-col gap-8">
          <section aria-labelledby="contact-title" className="flex flex-col gap-4">
            <h2 id="contact-title" className="text-display border-t pt-3 text-3xl">
              Dati di contatto
            </h2>
            <div className="grid gap-4 sm:grid-cols-2">
              {/* key: sessione e indirizzo arrivano dopo il primo disegno e i campi vanno precompilati */}
              <Field key={`name-${user?.id}-${saved?.id}`} defaultValue={saved?.name ?? (user ? fullName(user) : undefined)} label="Nome e cognome" name="name" autoComplete="name" minLength={2} maxLength={100} />
              <Field key={`email-${user?.id}`} defaultValue={user?.email} label="Email" name="email" type="email" autoComplete="email" maxLength={255} />
            </div>
          </section>

          <section aria-labelledby="shipping-title" className="flex flex-col gap-4">
            <h2 id="shipping-title" className="text-display border-t pt-3 text-3xl">
              Indirizzo di spedizione
            </h2>
            <Field key={`address-${saved?.id}`} defaultValue={saved?.address} label="Indirizzo" name="address" autoComplete="street-address" minLength={3} maxLength={200} />
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-[1fr_2fr_1fr]">
              <Field
                key={`postal-${saved?.id}`}
                defaultValue={saved?.postal_code}
                label="CAP"
                name="postal_code"
                autoComplete="postal-code"
                inputMode="numeric"
                pattern="[0-9]{5}"
                maxLength={5}
                title="5 cifre"
              />
              <Field
                key={`city-${saved?.id}`}
                defaultValue={saved?.city}
                label="Città"
                name="city"
                autoComplete="address-level2"
                minLength={2}
                maxLength={100}
                className="col-span-2 row-start-2 sm:col-span-1 sm:row-start-auto"
              />
              <Field
                key={`province-${saved?.id}`}
                defaultValue={saved?.province}
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

          <section aria-labelledby="payment-title" className="flex flex-col gap-4">
            <h2 id="payment-title" className="text-display border-t pt-3 text-3xl">
              Pagamento
            </h2>
            {cardAvailable ? (
              <RadioGroup
                aria-labelledby="payment-title"
                value={paymentMethod}
                onValueChange={(value) => setChosenMethod(value as PaymentMethod)}
              >
                <PaymentChoice value="card" icon={<CreditCard aria-hidden />} title="Carta">
                  Paghi subito sulla pagina sicura di Stripe, anche con Apple Pay o Google Pay.
                </PaymentChoice>
                <PaymentChoice value="cod" icon={<Truck aria-hidden />} title="Alla consegna">
                  Paghi il corriere quando ricevi il pacco.
                </PaymentChoice>
              </RadioGroup>
            ) : (
              <p className="rounded-lg border p-3 text-sm">
                <span className="font-medium">Pagamento alla consegna.</span>{" "}
                <span className="text-muted-foreground">Paghi il corriere quando ricevi il pacco.</span>
              </p>
            )}
          </section>
        </form>

        <Card className="panel lg:sticky lg:top-24">
          <CardContent className="flex flex-col gap-4">
            <h2 className="text-display text-3xl">Il tuo ordine</h2>
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
              <div role="alert" className="border border-signal p-3 text-sm text-signal">
                <p>{submitError.message}</p>
                {submitError.stock && (
                  <Link to="/carrello" className="underline underline-offset-4">
                    Torna al carrello
                  </Link>
                )}
              </div>
            )}

            <Button type="submit" form="checkout" size="lg" disabled={submitting}>
              {paymentMethod === "card"
                ? submitting
                  ? "Apertura del pagamento…"
                  : "Vai al pagamento"
                : submitting
                  ? "Invio dell'ordine…"
                  : "Conferma ordine"}
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function PaymentChoice({
  value,
  icon,
  title,
  children,
}: {
  value: PaymentMethod;
  icon: ReactNode;
  title: string;
  children: ReactNode;
}) {
  return (
    <label className="flex cursor-pointer items-start gap-3 rounded-lg border p-3 text-sm transition-colors has-data-checked:border-primary [&_svg]:size-4">
      <RadioGroupItem value={value} className="mt-0.5" />
      <span className="flex flex-col gap-0.5">
        <span className="flex items-center gap-2 font-medium">
          {icon}
          {title}
        </span>
        <span className="text-muted-foreground">{children}</span>
      </span>
    </label>
  );
}

/**
 * Chi torna da Stripe senza pagare arriva qui con ?pagamento_annullato=<id dell'ordine>.
 * L'ordine viene annullato subito, così i pezzi tornano in magazzino e si può riprovare.
 * Restituisce il messaggio da mostrare, o undefined se non si torna da Stripe.
 */
function useCancelledPayment(): string | undefined {
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const orderId = params.get("pagamento_annullato");
  const [notice, setNotice] = useState<string>();
  // In sviluppo React esegue gli effetti due volte: l'ordine va annullato una volta sola
  const handled = useRef<string | null>(null);

  useEffect(() => {
    if (!orderId || handled.current === orderId) return;
    handled.current = orderId;
    // Il parametro sparisce dall'indirizzo: ricaricando la pagina non si annulla di nuovo
    setParams(
      (prev) => {
        prev.delete("pagamento_annullato");
        return prev;
      },
      { replace: true },
    );

    postJson<CardOrderStatus>(cancelPaymentPath(orderId), {})
      .then((result) => {
        if (result.paid) {
          // Il pagamento era già arrivato: l'ordine è valido, si va alla conferma
          navigate("/ordine-confermato", { replace: true, state: { order: result.order } });
          clearCart();
        } else {
          setNotice("Pagamento annullato: non ti è stato addebitato nulla. Puoi riprovare o scegliere il pagamento alla consegna.");
        }
      })
      .catch(() => setNotice("Pagamento non completato: non ti è stato addebitato nulla. Puoi riprovare."));
  }, [orderId, setParams, navigate]);

  return notice;
}
