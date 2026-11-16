import { describe, expect, it } from "vitest";
import { formatPrice, orderCode } from "../../src/emails/layout.js";
import { orderConfirmationEmail } from "../../src/emails/orderConfirmation.js";
import { welcomeEmail } from "../../src/emails/welcome.js";
import type { OrderConfirmation } from "../../src/types.js";

const ORDER: OrderConfirmation = {
  id: "3f2a9c1e-7a8d-4b5e-9f3a-2c1d0e9f8a7b",
  total: "1300.10",
  payment_method: "cod",
  customer: {
    name: "Mario Rossi",
    email: "mario.rossi@example.com",
    address: "Via Roma 1",
    city: "Milano",
    postal_code: "20100",
    province: "MI",
  },
  items: [
    { product_id: "p1", name: "Basso <Vintage>", quantity: 1, unit_price: "1290.00" },
    { product_id: "p2", name: "Cavo jack", quantity: 2, unit_price: "5.05" },
  ],
};

describe("formatPrice e orderCode", () => {
  it("scrivono prezzi e codici come nel sito", () => {
    expect(formatPrice("1290.00")).toBe("1.290,00 €");
    expect(formatPrice("0.1")).toBe("0,10 €");
    expect(orderCode(ORDER.id)).toBe("3F2A9C1E");
  });
});

describe("welcomeEmail", () => {
  it("saluta per nome e porta al catalogo, in HTML e in testo", () => {
    const { subject, html, text } = welcomeEmail("Giulia", "http://localhost:5173/catalogo");
    expect(subject).toBe("Ti diamo il benvenuto su Sonora");
    expect(html).toContain("Ciao Giulia,");
    expect(html).toContain('href="http://localhost:5173/catalogo"');
    expect(text).toContain("http://localhost:5173/catalogo");
  });

  it("protegge l'HTML da un nome con caratteri speciali", () => {
    const { html } = welcomeEmail("<script>alert(1)</script>", "http://localhost:5173/catalogo");
    expect(html).not.toContain("<script>");
    expect(html).toContain("&lt;script&gt;");
  });
});

describe("orderConfirmationEmail", () => {
  it("riepiloga codice, articoli, totali di riga, totale e indirizzo", () => {
    const { subject, html, text } = orderConfirmationEmail(ORDER, null);
    expect(subject).toBe("Ordine 3F2A9C1E confermato");
    expect(html).toContain("Basso &lt;Vintage&gt;");
    expect(html).not.toContain("<Vintage>");
    expect(html).toContain("1.300,10 €");
    // 2 × 5,05 = 10,10: calcolato in centesimi, senza errori di arrotondamento
    expect(text).toContain("2 × Cavo jack — 10,10 €");
    expect(text).toContain("Totale: 1.300,10 €");
    expect(text).toContain("20100 Milano (MI)");
  });

  it("porta alla pagina dell'ordine solo se c'è un account", () => {
    const link = `http://localhost:5173/account/ordini/${ORDER.id}`;
    expect(orderConfirmationEmail(ORDER, link).html).toContain(`href="${link}"`);
    expect(orderConfirmationEmail(ORDER, null).html).not.toContain("/account/ordini/");
    expect(orderConfirmationEmail(ORDER, null).text).not.toContain("Segui l'ordine");
  });
});
