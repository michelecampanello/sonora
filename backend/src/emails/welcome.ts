// L'email di benvenuto, mandata appena un account viene creato.
import { button, emailLayout, escapeHtml, paragraph, PORTFOLIO_NOTE, type EmailContent } from "./layout.js";

export function welcomeEmail(name: string, catalogLink: string): EmailContent {
  const html = emailLayout(
    [
      paragraph(`Ciao ${escapeHtml(name)},`),
      paragraph("il tuo account Sonora è pronto. Dall'area personale puoi seguire i tuoi ordini e salvare i tuoi indirizzi, così il prossimo acquisto richiede pochi secondi."),
      button(catalogLink, "Sfoglia il catalogo"),
    ].join("\n          "),
    `Hai ricevuto questa email perché il tuo indirizzo è stato usato per registrarsi su Sonora. ${PORTFOLIO_NOTE}`,
  );

  const text = [
    `Ciao ${name},`,
    "",
    "il tuo account Sonora è pronto. Dall'area personale puoi seguire i tuoi ordini e salvare i tuoi indirizzi.",
    "",
    "Sfoglia il catalogo:",
    catalogLink,
    "",
    PORTFOLIO_NOTE,
  ].join("\n");

  return { subject: "Ti diamo il benvenuto su Sonora", html, text };
}
