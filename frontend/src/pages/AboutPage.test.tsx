import { screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { AboutPage } from "@/pages/AboutPage";
import { renderPage } from "@/test/render";

describe("AboutPage", () => {
  it("dice chi ha realizzato il progetto e con quale strumento", () => {
    renderPage(<AboutPage />, { path: "/chi-siamo" });
    expect(screen.getByRole("heading", { level: 1, name: "Chi siamo" })).toBeInTheDocument();
    expect(screen.getByText(/stato realizzato da/)).toHaveTextContent(
      "Sonora è stato realizzato da Michele Campanello, utilizzando perlopiù Claude Code, l'assistente di programmazione di Anthropic.",
    );
  });

  it("chiarisce che non è un vero negozio e porta al codice", () => {
    renderPage(<AboutPage />, { path: "/chi-siamo" });
    expect(screen.getByText(/non un vero negozio/)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "GitHub" })).toHaveAttribute("href", "https://github.com/michelecampanello/sonora");
  });
});
