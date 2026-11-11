import { screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { Header } from "@/components/layout/Header";
import { setUser } from "@/hooks/useAuth";
import { mockApi } from "@/test/mockApi";
import { renderPage } from "@/test/render";
import type { User } from "@/lib/types";

const giulia: User = { id: "00000000-0000-4000-8000-000000000001", name: "Giulia Bianchi", email: "giulia@example.com", role: "customer" };

const renderHeader = (url = "/") => renderPage(<Header />, { path: "*", url });

afterEach(() => setUser(null));

describe("menu dell'account", () => {
  it("chi non ha fatto l'accesso vede il link Accedi e nessun menu", () => {
    setUser(null);
    renderHeader();
    expect(screen.getByRole("link", { name: "Accedi" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Il mio account/ })).not.toBeInTheDocument();
  });

  it("si apre dall'header e mostra le sezioni dell'area personale come link", async () => {
    setUser(giulia);
    const { user } = renderHeader();

    await user.click(screen.getByRole("button", { name: "Il mio account, Giulia Bianchi" }));
    const menu = await screen.findByRole("menu");

    expect(within(menu).getByText("giulia@example.com")).toBeInTheDocument();
    const links = within(menu).getAllByRole("menuitem").filter((item) => item.tagName === "A");
    expect(links.map((link) => [link.textContent, link.getAttribute("href")])).toEqual([
      ["Ordini", "/account/ordini"],
      ["Indirizzi", "/account/indirizzi"],
      ["Pagamenti", "/account/pagamenti"],
      ["Impostazioni", "/account/impostazioni"],
    ]);
  });

  it("porta alla sezione scelta e si chiude", async () => {
    setUser(giulia);
    const { user } = renderHeader();

    await user.click(screen.getByRole("button", { name: /Il mio account/ }));
    await user.click(await screen.findByRole("menuitem", { name: "Indirizzi" }));

    expect(screen.getByTestId("current-path")).toHaveTextContent("/account/indirizzi");
    expect(screen.queryByRole("menu")).not.toBeInTheDocument();
  });

  it("segna la sezione in cui ci si trova, anche nelle sottopagine", async () => {
    setUser(giulia);
    const { user } = renderHeader("/account/ordini/3f2a9c1e-7a8d-4b5e-9f3a-2c1d0e9f8a7b");

    await user.click(screen.getByRole("button", { name: /Il mio account/ }));
    expect(await screen.findByRole("menuitem", { name: "Ordini" })).toHaveAttribute("aria-current", "page");
    expect(screen.getByRole("menuitem", { name: "Indirizzi" })).not.toHaveAttribute("aria-current");
  });

  it("si usa anche da tastiera", async () => {
    setUser(giulia);
    const { user } = renderHeader();

    screen.getByRole("button", { name: /Il mio account/ }).focus();
    await user.keyboard("{Enter}");
    expect(await screen.findByRole("menu")).toBeInTheDocument();
    await user.keyboard("{Escape}");
    expect(screen.queryByRole("menu")).not.toBeInTheDocument();
  });

  it("Esci chiude la sessione e porta alla home", async () => {
    setUser(giulia);
    mockApi({ "POST /api/auth/logout": { body: { status: "ok" } } });
    const { user } = renderHeader("/account/ordini");

    await user.click(screen.getByRole("button", { name: /Il mio account/ }));
    await user.click(await screen.findByRole("menuitem", { name: "Esci" }));

    expect(await screen.findByRole("link", { name: "Accedi" })).toBeInTheDocument();
    expect(screen.getByTestId("current-path")).toHaveTextContent(/^\/$/);
  });

  it("se l'uscita non riesce lo dice e lascia il menu aperto", async () => {
    setUser(giulia);
    mockApi({ "POST /api/auth/logout": { status: 500, body: { error: "Errore interno del server" } } });
    const { user } = renderHeader("/account/ordini");

    await user.click(screen.getByRole("button", { name: /Il mio account/ }));
    await user.click(await screen.findByRole("menuitem", { name: "Esci" }));

    expect(await screen.findByRole("menuitem", { name: "Uscita non riuscita, riprova" })).toBeInTheDocument();
    expect(screen.getByRole("menu")).toBeInTheDocument();
    expect(screen.getByTestId("current-path")).toHaveTextContent("/account/ordini");
  });
});
