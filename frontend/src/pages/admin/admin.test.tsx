import { screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { setUser } from "@/hooks/useAuth";
import AdminRoutes from "@/pages/admin/AdminRoutes";
import { makeProduct } from "@/test/fixtures";
import { mockApi, sentBody } from "@/test/mockApi";
import { renderPage } from "@/test/render";
import type { AdminOrderDetail, AdminProduct, User } from "@/lib/types";

const admin: User = { id: "00000000-0000-4000-8000-0000000000ad", name: "Admin", email: "admin@example.com", role: "admin" };
const customer: User = { ...admin, role: "customer", name: "Cliente" };
const ORDER_ID = "3f2a9c1e-7a8d-4b5e-9f3a-2c1d0e9f8a7b";

const renderAdmin = (url: string) => renderPage(<AdminRoutes />, { path: "/admin/*", url });

afterEach(() => setUser(null));

describe("accesso al pannello", () => {
  it("chi non ha fatto l'accesso va alla pagina di login", () => {
    setUser(null);
    renderAdmin("/admin/ordini");
    expect(screen.getByTestId("current-path")).toHaveTextContent("/accedi");
  });

  it("per un cliente il pannello non esiste", () => {
    setUser(customer);
    renderAdmin("/admin");
    expect(screen.getByRole("heading", { name: "Pagina non trovata" })).toBeInTheDocument();
    expect(screen.queryByRole("navigation", { name: "Pannello admin" })).not.toBeInTheDocument();
  });

  it("un admin vede il menu e la panoramica", async () => {
    setUser(admin);
    mockApi({
      "GET /api/admin/stats": {
        body: { orders: { pending: 4, shipped: 2, paid: 9, cancelled: 1 }, revenue: "1290.00", activeProducts: 50, lowStockProducts: 3 },
      },
    });
    renderAdmin("/admin");

    const nav = screen.getByRole("navigation", { name: "Pannello admin" });
    expect(within(nav).getByRole("link", { name: "Panoramica" })).toHaveAttribute("aria-current", "page");
    expect(await screen.findByRole("link", { name: /Da spedire\s*4/ })).toHaveAttribute("href", "/admin/ordini?status=pending");
    expect(screen.getByRole("link", { name: /Incassato\s*1\.290,00 €/ })).toBeInTheDocument();
  });
});

describe("dettaglio ordine", () => {
  const order: AdminOrderDetail = {
    id: ORDER_ID,
    status: "pending",
    total: "80.00",
    created_at: "2026-11-10T10:00:00Z",
    customer: { name: "Mario Rossi", email: "mario@example.com", address: "Via Roma 1", city: "Milano", postal_code: "20100", province: "MI" },
    items: [{ product_id: "p1", name: "Cavo jack", slug: "cavo-jack", image_url: null, quantity: 2, unit_price: "40.00" }],
    next_statuses: ["shipped", "cancelled"],
  };

  it("cambia lo stato e mostra le nuove azioni possibili", async () => {
    setUser(admin);
    const fetchMock = mockApi({
      [`GET /api/admin/orders/${ORDER_ID}`]: { body: order },
      [`PATCH /api/admin/orders/${ORDER_ID}/status`]: { body: { ...order, status: "shipped", next_statuses: ["paid", "cancelled"] } },
    });
    const { user } = renderAdmin(`/admin/ordini/${ORDER_ID}`);

    await user.click(await screen.findByRole("button", { name: "Segna come spedito" }));

    expect(sentBody(fetchMock, `/api/admin/orders/${ORDER_ID}/status`)).toEqual({ status: "shipped" });
    expect(await screen.findByText("Spedito")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Segna come consegnato e pagato" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Segna come spedito" })).not.toBeInTheDocument();
  });

  it("chiede conferma prima di annullare", async () => {
    setUser(admin);
    const fetchMock = mockApi({
      [`GET /api/admin/orders/${ORDER_ID}`]: { body: order },
      [`PATCH /api/admin/orders/${ORDER_ID}/status`]: { body: { ...order, status: "cancelled", next_statuses: [] } },
    });
    const { user } = renderAdmin(`/admin/ordini/${ORDER_ID}`);

    await user.click(await screen.findByRole("button", { name: "Annulla ordine" }));
    const dialog = await screen.findByRole("alertdialog");
    expect(dialog).toHaveTextContent("Gli articoli tornano in magazzino");
    expect(sentBody(fetchMock, `/api/admin/orders/${ORDER_ID}/status`)).toBeUndefined();

    await user.click(within(dialog).getByRole("button", { name: "Annulla ordine" }));
    expect(sentBody(fetchMock, `/api/admin/orders/${ORDER_ID}/status`)).toEqual({ status: "cancelled" });
    expect(await screen.findByText("Annullato")).toBeInTheDocument();
  });

  it("mostra l'errore se il server rifiuta il cambio", async () => {
    setUser(admin);
    mockApi({
      [`GET /api/admin/orders/${ORDER_ID}`]: { body: order },
      [`PATCH /api/admin/orders/${ORDER_ID}/status`]: { status: 409, body: { error: 'Un ordine "paid" non può passare a "shipped"' } },
    });
    const { user } = renderAdmin(`/admin/ordini/${ORDER_ID}`);

    await user.click(await screen.findByRole("button", { name: "Segna come spedito" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("non può passare");
  });
});

describe("prodotti", () => {
  const product: AdminProduct = {
    ...makeProduct({ name: "Nordwood ST-1", price: "349.00", stock: 3 }),
    sku: "SON-0001",
    active: true,
    featured: false,
  };

  it("invia solo i campi modificati e mostra i valori salvati", async () => {
    setUser(admin);
    const fetchMock = mockApi({
      "GET /api/admin/products": { body: { items: [product], total: 1, page: 1, pages: 1 } },
      [`PATCH /api/admin/products/${product.id}`]: { body: { ...product, stock: 20, price: "329.00" } },
    });
    const { user } = renderAdmin("/admin/prodotti");

    const save = await screen.findByRole("button", { name: "Salva di Nordwood ST-1" });
    expect(save).toBeDisabled(); // nessuna modifica, niente da salvare

    const stock = screen.getByLabelText("Magazzino di Nordwood ST-1");
    await user.clear(stock);
    await user.type(stock, "20");
    const price = screen.getByLabelText("Prezzo di Nordwood ST-1");
    await user.clear(price);
    await user.type(price, "329,00");
    await user.click(save);

    expect(sentBody(fetchMock, `/api/admin/products/${product.id}`)).toEqual({ stock: 20, price: "329.00" });
    expect(await screen.findByDisplayValue("20")).toBeInTheDocument();
    expect(save).toBeDisabled();
  });

  it("la ricerca e il filtro finiscono nella richiesta al server", async () => {
    setUser(admin);
    const fetchMock = mockApi({ "GET /api/admin/products": { body: { items: [], total: 0, page: 1, pages: 0 } } });
    const { user } = renderAdmin("/admin/prodotti");

    await user.type(screen.getByRole("searchbox", { name: "Cerca prodotti" }), "nordwood{Enter}");
    await user.click(screen.getByRole("checkbox", { name: "Solo quasi esauriti" }));

    const lastUrl = new URL(String(fetchMock.mock.calls.at(-1)?.[0]), "http://localhost");
    expect(Object.fromEntries(lastUrl.searchParams)).toEqual({ page: "1", q: "nordwood", lowStock: "true" });
    expect(await screen.findByText("Nessun prodotto trovato.")).toBeInTheDocument();
  });
});
