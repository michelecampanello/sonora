import { screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { setUser } from "@/hooks/useAuth";
import { LoginPage } from "@/pages/LoginPage";
import { mockApi, sentBody } from "@/test/mockApi";
import { renderPage } from "@/test/render";

const user = { id: "00000000-0000-4000-8000-000000000001", name: "Giulia", email: "giulia@example.com", role: "customer" as const };

// Lo stato dell'accesso vive fuori da React: dopo ogni test si torna a "nessuno collegato"
afterEach(() => setUser(null));

async function fillAndSubmit(ui: ReturnType<typeof renderPage>, email: string, password: string) {
  await ui.user.type(screen.getByLabelText("Email"), email);
  await ui.user.type(screen.getByLabelText("Password"), password);
  await ui.user.click(screen.getByRole("button", { name: "Accedi" }));
}

describe("LoginPage", () => {
  it("invia le credenziali e, dopo l'accesso, torna alla pagina da cui si era partiti", async () => {
    const fetchMock = mockApi({ "POST /api/auth/login": { body: { user } } });
    const ui = renderPage(<LoginPage />, { path: "/accedi", state: { from: "/checkout" } });

    await fillAndSubmit(ui, "giulia@example.com", "password-sicura");

    expect(sentBody(fetchMock, "/api/auth/login")).toEqual({ email: "giulia@example.com", password: "password-sicura" });
    expect(await screen.findByTestId("current-path")).toHaveTextContent("/checkout");
  });

  it("senza una pagina di provenienza porta alla home", async () => {
    mockApi({ "POST /api/auth/login": { body: { user } } });
    const ui = renderPage(<LoginPage />, { path: "/accedi" });
    await fillAndSubmit(ui, "giulia@example.com", "password-sicura");
    expect(await screen.findByTestId("current-path")).toHaveTextContent(/^\/$/);
  });

  it("mostra l'errore del server e permette di riprovare", async () => {
    mockApi({ "POST /api/auth/login": { status: 401, body: { error: "Email o password non corrette" } } });
    const ui = renderPage(<LoginPage />, { path: "/accedi" });

    await fillAndSubmit(ui, "giulia@example.com", "sbagliata");

    expect(await screen.findByRole("alert")).toHaveTextContent("Email o password non corrette");
    expect(screen.getByRole("button", { name: "Accedi" })).toBeEnabled();
    expect(screen.getByTestId("current-path")).toHaveTextContent("/accedi");
  });

  it("chi ha già fatto l'accesso viene rimandato alla home", () => {
    setUser(user);
    renderPage(<LoginPage />, { path: "/accedi" });
    expect(screen.queryByRole("button", { name: "Accedi" })).not.toBeInTheDocument();
    expect(screen.getByTestId("current-path")).toHaveTextContent(/^\/$/);
  });

  it("ha i link per la registrazione e per il recupero della password", async () => {
    const ui = renderPage(<LoginPage />, { path: "/accedi", state: { from: "/checkout" } });
    expect(screen.getByRole("link", { name: "Password dimenticata?" })).toHaveAttribute("href", "/password-dimenticata");
    await ui.user.click(screen.getByRole("link", { name: "Registrati" }));
    expect(screen.getByTestId("current-path")).toHaveTextContent("/registrati");
  });
});
