// La conferma d'ordine: articoli, totale e indirizzo di spedizione.
import type { OrderConfirmation } from "../types.js";
import {
  BORDER,
  button,
  emailLayout,
  escapeHtml,
  formatPrice,
  MUTED,
  orderCode,
  paragraph,
  PORTFOLIO_NOTE,
  type EmailContent,
} from "./layout.js";

const lineTotal = (unitPrice: string, quantity: number): string =>
  ((Math.round(Number(unitPrice) * 100) * quantity) / 100).toFixed(2);

/** Come si paga, in una riga */
const PAYMENT_NOTE = {
  cod: "Alla consegna: paghi il corriere quando ricevi il pacco.",
  card: "Con carta: pagamento ricevuto.",
} as const;

/** orderLink: la pagina dell'ordine nell'area personale; null per chi ha comprato senza account */
export function orderConfirmationEmail(order: OrderConfirmation, orderLink: string | null): EmailContent {
  const code = orderCode(order.id);
  const { customer } = order;
  const addressLines = [customer.name, customer.address, `${customer.postal_code} ${customer.city} (${customer.province})`];

  const rows = order.items
    .map(
      (item) => `<tr>
              <td style="padding:10px 0;border-bottom:1px solid ${BORDER};font-size:15px;line-height:1.4">${escapeHtml(item.name)}<br><span style="font-size:13px;color:${MUTED}">${item.quantity} × ${formatPrice(item.unit_price)}</span></td>
              <td style="padding:10px 0 10px 16px;border-bottom:1px solid ${BORDER};font-size:15px;text-align:right;white-space:nowrap;vertical-align:top">${formatPrice(lineTotal(item.unit_price, item.quantity))}</td>
            </tr>`,
    )
    .join("\n            ");

  const html = emailLayout(
    [
      paragraph(`Grazie ${escapeHtml(customer.name)}, abbiamo ricevuto il tuo ordine <strong>${code}</strong>.`),
      `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 24px;border-top:1px solid ${BORDER}">
            ${rows}
            <tr>
              <td style="padding:12px 0;font-size:16px;font-weight:bold">Totale</td>
              <td style="padding:12px 0 12px 16px;font-size:16px;font-weight:bold;text-align:right;white-space:nowrap">${formatPrice(order.total)}</td>
            </tr>
          </table>`,
      paragraph("Spedizione a", `font-size:13px;margin:0 0 4px;color:${MUTED}`),
      paragraph(addressLines.map(escapeHtml).join("<br>"), "font-size:15px;margin:0 0 24px"),
      paragraph("Pagamento", `font-size:13px;margin:0 0 4px;color:${MUTED}`),
      paragraph(PAYMENT_NOTE[order.payment_method], "font-size:15px;margin:0 0 24px"),
      orderLink ? button(orderLink, "Segui l'ordine") : "",
    ].join("\n          "),
    PORTFOLIO_NOTE,
  );

  const text = [
    `Grazie ${customer.name}, abbiamo ricevuto il tuo ordine ${code}.`,
    "",
    ...order.items.map((item) => `${item.quantity} × ${item.name} — ${formatPrice(lineTotal(item.unit_price, item.quantity))}`),
    `Totale: ${formatPrice(order.total)}`,
    "",
    "Spedizione a:",
    ...addressLines,
    "",
    `Pagamento: ${PAYMENT_NOTE[order.payment_method]}`,
    ...(orderLink ? ["", "Segui l'ordine:", orderLink] : []),
    "",
    PORTFOLIO_NOTE,
  ].join("\n");

  return { subject: `Ordine ${code} confermato`, html, text };
}
