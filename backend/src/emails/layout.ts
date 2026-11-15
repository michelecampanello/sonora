// Le parti comuni a tutte le email: struttura, pulsante, formati di prezzi e codici.
// Stili scritti sugli elementi e layout a tabella: molti client di posta ignorano <style> e flexbox.

export interface EmailContent {
  subject: string;
  html: string;
  text: string;
}

export const MUTED = "#6b675e";
export const BORDER = "#e2ddd2";

/** Rende un testo sicuro da inserire nell'HTML, anche dentro un attributo */
export const escapeHtml = (value: string): string =>
  value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");

/**
 * Prezzo in euro all'italiana, come nel sito: "1290.00" → "1.290,00 €".
 * Non Intl.NumberFormat("it-IT"): con 4 cifre non mette il punto delle migliaia.
 */
export function formatPrice(price: string | number): string {
  const [integer = "0", decimals = "00"] = Number(price).toFixed(2).split(".");
  return `${integer.replace(/\B(?=(\d{3})+(?!\d))/g, ".")},${decimals} €`;
}

/** Il codice breve con cui un ordine viene mostrato al cliente, uguale a quello del sito */
export const orderCode = (id: string): string => id.slice(0, 8).toUpperCase();

/** Un paragrafo; `html` dev'essere già sicuro (testi passati da escapeHtml) */
export const paragraph = (html: string, style = "font-size:16px"): string =>
  `<p style="margin:0 0 16px;line-height:1.5;${style}">${html}</p>`;

/** Il pulsante principale dell'email, seguito dall'indirizzo in chiaro per chi non può cliccarlo */
export function button(href: string, label: string): string {
  const safeHref = escapeHtml(href);
  return `<p style="margin:8px 0 24px">
            <a href="${safeHref}" style="display:inline-block;padding:12px 20px;background:#1c1b19;color:#ffffff;text-decoration:none;font-size:16px;font-weight:bold">${escapeHtml(label)}</a>
          </p>
          <p style="margin:0 0 8px;font-size:13px;line-height:1.5;color:${MUTED}">Se il pulsante non funziona, copia questo indirizzo nel browser:</p>
          <p style="margin:0 0 24px;font-size:13px;line-height:1.5;word-break:break-all"><a href="${safeHref}" style="color:#1c1b19">${safeHref}</a></p>`;
}

/** La cornice comune: nome del sito in alto, contenuto, nota finale in piccolo */
export function emailLayout(content: string, footnote: string): string {
  return `<!doctype html>
<html lang="it">
  <body style="margin:0;padding:24px;background:#f4f1ea;font-family:Helvetica,Arial,sans-serif;color:#1c1b19">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;margin:0 auto;background:#ffffff;border:1px solid ${BORDER}">
      <tr>
        <td style="padding:32px">
          <p style="margin:0 0 24px;font-size:22px;font-weight:bold;letter-spacing:-0.02em">Sonora</p>
          ${content}
          <p style="margin:0;font-size:13px;line-height:1.5;color:${MUTED}">${footnote}</p>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}

/** Ricordato in ogni email che parla di account o acquisti: il sito è dimostrativo */
export const PORTFOLIO_NOTE = "Sonora è un progetto portfolio: nessun ordine viene spedito e nessun pagamento è reale.";
