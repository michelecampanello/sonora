import { describe, expect, it } from "vitest";
import { PageMeta } from "@/components/PageMeta";
import { renderPage } from "@/test/render";

const meta = (selector: string) => document.head.querySelector(selector)?.getAttribute("content") ?? null;

describe("PageMeta", () => {
  it("imposta titolo, description, anteprima social e indirizzo canonico", () => {
    renderPage(<PageMeta title="Bassi" description="Bassi elettrici e acustici" />, { path: "/categorie/bassi" });

    expect(document.querySelector("title")).toHaveTextContent("Bassi — Sonora");
    expect(meta('meta[name="description"]')).toBe("Bassi elettrici e acustici");
    expect(meta('meta[property="og:title"]')).toBe("Bassi — Sonora");
    expect(document.head.querySelector('link[rel="canonical"]')).toHaveAttribute("href", "http://localhost:3000/categorie/bassi");
    expect(meta('meta[name="robots"]')).toBeNull();
  });

  it("tiene fuori dai motori di ricerca le pagine con noindex", () => {
    renderPage(<PageMeta title="Carrello" noindex />);

    expect(meta('meta[name="robots"]')).toBe("noindex");
    expect(document.head.querySelector('link[rel="canonical"]')).toBeNull();
  });

  it("quando la pagina si chiude torna ai valori del sito", () => {
    const { unmount } = renderPage(<PageMeta title="Carrello" description="Il tuo carrello" noindex />);
    unmount();

    expect(meta('meta[name="description"]')).toMatch(/^Chitarre, bassi/);
    expect(meta('meta[name="robots"]')).toBeNull();
  });
});
