import { screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { addToCart, clearCart, useCart } from "@/hooks/useCart";
import { setUser } from "@/hooks/useAuth";
import { redirectTo } from "@/lib/redirect";
import { CheckoutPage } from "@/pages/CheckoutPage";
import { OrderConfirmedPage } from "@/pages/OrderConfirmedPage";
import { makeProduct } from "@/test/fixtures";
import { mockApi, sentBody, type MockResponse } from "@/test/mockApi";
import { renderPage } from "@/test/render";
import type { CardOrderStatus, OrderConfirmation } from "@/lib/types";

vi.mock("@/lib/redirect", () => ({ redirectTo: vi.fn() }));
const redirect = vi.mocked(redirectTo);

const ORDER_ID = "3f2a9c1e-7a8d-4b5e-9f3a-2c1d0e9f8a7b";
const product = makeProduct({ name: "Nordwood ST-1", price: "349.00", stock: 5 });
const customer = { name: "Mario Rossi", email: "mario@example.com", address: "Via Roma 1", city: "Milano", postal_code: "20100", province: "MI" };
const order: OrderConfirmation = {
  id: ORDER_ID,
  total: "349.00",
  payment_method: "card",
  customer,
  items: [{ product_id: product.id, name: product.name, quantity: 1, unit_price: "349.00" }],
};

/** Quanti articoli ha il carrello, letto con lo stesso hook che usa il sito */
function CartCount() {
  return <span data-testid="cart-count">{useCart().count}</span>;
}

function serve(routes: Record<string, MockResponse>, card = true) {
  return mockApi({
    "GET /api/products": { body: { items: [product], total: 1, page: 1, pages: 1 } },
    "GET /api/orders/payment-options": { body: { card } },
    ...routes,
  });
}

async function fillCheckout(user: ReturnType<typeof renderPage>["user"]) {
  await user.type(await screen.findByLabelText("Nome e cognome"), customer.name);
  await user.type(screen.getByLabelText("Email"), customer.email);
  await user.type(screen.getByLabelText("Indirizzo"), customer.address);
  await user.type(screen.getByLabelText("CAP"), customer.postal_code);
  await user.type(screen.getByLabelText("Città"), customer.city);
  await user.type(screen.getByLabelText("Provincia"), customer.province);
}

beforeEach(() => {
  clearCart();
  setUser(null);
  addToCart(product.id, product.stock);
  redirect.mockReset();
});
afterEach(() => vi.unstubAllGlobals());

describe("checkout", () => {
  it("con la carta manda il cliente sulla pagina di Stripe e tiene il carrello finché non paga", async () => {
    const fetchMock = serve({
      "POST /api/orders": { status: 201, body: { ...order, checkout_url: "https://checkout.stripe.com/c/pay/cs_test_abc" } },
    });
    const { user } = renderPage(
      <>
        <CheckoutPage />
        <CartCount />
      </>,
      { path: "/checkout" },
    );

    await fillCheckout(user);
    expect(await screen.findByRole("radio", { name: /Carta/ })).toBeChecked();
    await user.click(screen.getByRole("button", { name: "Vai al pagamento" }));

    expect(sentBody(fetchMock, "/api/orders")).toMatchObject({ payment_method: "card", items: [{ productId: product.id, quantity: 1 }] });
    expect(redirect).toHaveBeenCalledWith("https://checkout.stripe.com/c/pay/cs_test_abc");
    expect(screen.getByTestId("cart-count")).toHaveTextContent("1");
  });

  it("si può scegliere il pagamento alla consegna, che conferma subito l'ordine", async () => {
    const fetchMock = serve({ "POST /api/orders": { status: 201, body: { ...order, payment_method: "cod" } } });
    const { user } = renderPage(<CheckoutPage />, { path: "/checkout" });

    await fillCheckout(user);
    await user.click(await screen.findByRole("radio", { name: /Alla consegna/ }));
    await user.click(screen.getByRole("button", { name: "Conferma ordine" }));

    expect(sentBody(fetchMock, "/api/orders")).toMatchObject({ payment_method: "cod" });
    expect(redirect).not.toHaveBeenCalled();
    expect(screen.getByTestId("current-path")).toHaveTextContent("/ordine-confermato");
  });

  it("senza Stripe configurato propone solo il pagamento alla consegna", async () => {
    serve({}, false);
    renderPage(<CheckoutPage />, { path: "/checkout" });

    expect(await screen.findByText("Pagamento alla consegna.")).toBeInTheDocument();
    expect(screen.queryByRole("radio")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Conferma ordine" })).toBeInTheDocument();
  });

  it("tornando da Stripe senza pagare annulla l'ordine e lo dice", async () => {
    const cancelled: CardOrderStatus = { order, status: "cancelled", paid: false };
    const fetchMock = serve({ [`POST /api/orders/${ORDER_ID}/cancel-payment`]: { body: cancelled } });
    renderPage(<CheckoutPage />, { path: "/checkout", url: `/checkout?pagamento_annullato=${ORDER_ID}` });

    expect(await screen.findByRole("status")).toHaveTextContent(/Pagamento annullato/);
    expect(fetchMock.mock.calls.filter(([url]) => String(url).endsWith("/cancel-payment"))).toHaveLength(1);
  });
});

describe("ritorno da Stripe dopo il pagamento", () => {
  const renderConfirmation = (status: CardOrderStatus) => {
    serve({ "GET /api/orders/checkout/cs_test_abc": { body: status } });
    return renderPage(
      <>
        <OrderConfirmedPage />
        <CartCount />
      </>,
      { path: "/ordine-confermato", url: "/ordine-confermato?session_id=cs_test_abc" },
    );
  };

  it("a pagamento ricevuto conferma l'ordine e svuota il carrello", async () => {
    renderConfirmation({ order, status: "pending", paid: true });

    expect(await screen.findByRole("heading", { name: "Ordine 3F2A9C1E confermato" })).toBeInTheDocument();
    expect(screen.getByText(/Abbiamo ricevuto il pagamento con carta/)).toBeInTheDocument();
    expect(screen.getByTestId("cart-count")).toHaveTextContent("0");
  });

  it("se l'ordine è stato annullato lo dice e lascia il carrello com'è", async () => {
    renderConfirmation({ order, status: "cancelled", paid: false });

    expect(await screen.findByRole("heading", { name: "Pagamento non completato" })).toBeInTheDocument();
    expect(screen.getByTestId("cart-count")).toHaveTextContent("1");
  });

  it("se la conferma di Stripe non è ancora arrivata permette di ricontrollare", async () => {
    renderConfirmation({ order, status: "awaiting_payment", paid: false });

    expect(await screen.findByRole("heading", { name: "Pagamento in verifica" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Controlla di nuovo" })).toBeInTheDocument();
  });
});
