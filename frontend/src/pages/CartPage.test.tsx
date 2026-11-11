import { screen, within } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";
import { addToCart, clearCart } from "@/hooks/useCart";
import { CartPage } from "@/pages/CartPage";
import { makeProduct } from "@/test/fixtures";
import { mockApi } from "@/test/mockApi";
import { renderPage } from "@/test/render";
import type { ProductSummary } from "@/lib/types";

const serveProducts = (...items: ProductSummary[]) =>
  mockApi({ "GET /api/products": { body: { items, total: items.length, page: 1, pages: 1 } } });

const totalRow = () => screen.getByText("Totale").parentElement!;

beforeEach(() => clearCart());

describe("CartPage", () => {
  it("con il carrello vuoto invita ad andare al catalogo", async () => {
    const { user } = renderPage(<CartPage />, { path: "/carrello" });
    expect(screen.getByText("Il carrello è vuoto.")).toBeInTheDocument();

    await user.click(screen.getByRole("link", { name: "Vai al catalogo" }));
    expect(screen.getByTestId("current-path")).toHaveTextContent("/catalogo");
  });

  it("mostra i prodotti con il totale e cambia le quantità", async () => {
    const product = makeProduct({ name: "Nordwood ST-1", price: "1290.00", stock: 3 });
    serveProducts(product);
    addToCart(product.id, product.stock);

    const { user } = renderPage(<CartPage />, { path: "/carrello" });
    expect(await screen.findByText("Nordwood ST-1")).toBeInTheDocument();
    expect(totalRow()).toHaveTextContent("1.290,00 €");

    const quantity = screen.getByRole("group", { name: "Quantità di Nordwood ST-1" });
    await user.click(within(quantity).getByRole("button", { name: "Aumenta quantità" }));
    await user.click(within(quantity).getByRole("button", { name: "Aumenta quantità" }));

    expect(within(quantity).getByText("3")).toBeInTheDocument();
    expect(totalRow()).toHaveTextContent("3.870,00 €");
    // Non si può superare la disponibilità né scendere sotto 1
    expect(within(quantity).getByRole("button", { name: "Aumenta quantità" })).toBeDisabled();
  });

  it("rimuove un prodotto dal carrello", async () => {
    const product = makeProduct({ name: "Cavo jack" });
    serveProducts(product);
    addToCart(product.id, product.stock);

    const { user } = renderPage(<CartPage />, { path: "/carrello" });
    await user.click(await screen.findByRole("button", { name: "Rimuovi" }));
    expect(screen.getByText("Il carrello è vuoto.")).toBeInTheDocument();
  });

  it("blocca il checkout se un prodotto non è più disponibile nella quantità scelta", async () => {
    const product = makeProduct({ stock: 5 });
    addToCart(product.id, 5);
    addToCart(product.id, 5);
    addToCart(product.id, 5);
    // Nel frattempo qualcun altro ha comprato: ne restano 2
    serveProducts({ ...product, stock: 2 });

    renderPage(<CartPage />, { path: "/carrello" });
    expect(await screen.findByText(/Disponibili solo 2 pezzi/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Vai alla cassa" })).toBeDisabled();
    expect(screen.queryByRole("link", { name: "Vai alla cassa" })).not.toBeInTheDocument();
  });

  it("con il carrello valido porta alla cassa", async () => {
    const product = makeProduct();
    serveProducts(product);
    addToCart(product.id, product.stock);

    const { user } = renderPage(<CartPage />, { path: "/carrello" });
    await user.click(await screen.findByRole("link", { name: "Vai alla cassa" }));
    expect(screen.getByTestId("current-path")).toHaveTextContent("/checkout");
  });

  it("mostra un errore se il catalogo non risponde", async () => {
    mockApi({ "GET /api/products": { status: 500, body: { error: "Errore interno del server" } } });
    addToCart(makeProduct().id, 10);

    renderPage(<CartPage />, { path: "/carrello" });
    expect(await screen.findByText("Non è stato possibile caricare il carrello.")).toBeInTheDocument();
    expect(screen.getByText("Errore interno del server")).toBeInTheDocument();
  });
});
