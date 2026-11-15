import { Resend } from "resend";
import { FRONTEND_ORIGIN } from "../config.js";
import type { EmailContent } from "../emails/layout.js";
import { orderConfirmationEmail } from "../emails/orderConfirmation.js";
import { passwordResetEmail } from "../emails/passwordReset.js";
import { welcomeEmail } from "../emails/welcome.js";
import type { OrderConfirmation } from "../types.js";

const RESEND_API_KEY = process.env.RESEND_API_KEY;
const MAIL_FROM = process.env.MAIL_FROM;

// In produzione servono entrambi: senza chiave le email non partono, e il mittente
// deve avere un dominio verificato su Resend (l'indirizzo di prova non va bene).
if (process.env.NODE_ENV === "production" && (!RESEND_API_KEY || !MAIL_FROM)) {
  throw new Error("Variabili RESEND_API_KEY e MAIL_FROM obbligatorie in produzione: senza non si possono inviare le email");
}

const resend = RESEND_API_KEY ? new Resend(RESEND_API_KEY) : null;
// In sviluppo, con la chiave ma senza un dominio verificato, si usa il mittente di prova di Resend
// || e non ??: anche una riga "MAIL_FROM=" lasciata vuota nel file .env vale come assente
const from = MAIL_FROM || "Sonora <onboarding@resend.dev>";

/** L'email non è partita: il messaggio spiega perché, per i log del server */
export class MailError extends Error {}

type EmailType = "password_reset" | "welcome" | "order_confirmation";

/**
 * Invia un'email con Resend. Lancia MailError se Resend rifiuta l'invio.
 * Senza RESEND_API_KEY (solo in sviluppo) non invia nulla e stampa `devNote` nella console.
 */
async function sendEmail(to: string, content: EmailContent, type: EmailType, devNote: string): Promise<void> {
  if (!resend) {
    // Nei test le email non servono, e i messaggi riempirebbero l'output
    if (process.env.NODE_ENV !== "test") console.log(`[email non inviata, RESEND_API_KEY assente] ${devNote}`);
    return;
  }

  const { subject, html, text } = content;
  // L'SDK non lancia eccezioni per gli errori dell'API: li restituisce in `error`, e vanno controllati
  const { error } = await resend.emails.send({ from, to, subject, html, text, tags: [{ name: "type", value: type }] });
  if (error) {
    throw new MailError(`Invio con Resend non riuscito (${error.name}${error.statusCode ? `, ${error.statusCode}` : ""}): ${error.message}`);
  }
}

/** Invia il link di reset. Lancia MailError se Resend rifiuta l'invio. */
export const sendPasswordResetEmail = (to: string, link: string): Promise<void> =>
  sendEmail(to, passwordResetEmail(link), "password_reset", `Reset password per ${to}: ${link}`);

/** Dà il benvenuto a chi ha appena creato un account */
export const sendWelcomeEmail = (to: string, name: string): Promise<void> =>
  sendEmail(to, welcomeEmail(name, `${FRONTEND_ORIGIN}/catalogo`), "welcome", `Benvenuto a ${to}`);

/**
 * Conferma un ordine all'indirizzo indicato nel checkout.
 * withAccountLink: l'ordine è collegato a un account, quindi l'email porta alla sua pagina nell'area personale.
 */
export function sendOrderConfirmationEmail(order: OrderConfirmation, withAccountLink: boolean): Promise<void> {
  const link = withAccountLink ? `${FRONTEND_ORIGIN}/account/ordini/${order.id}` : null;
  return sendEmail(
    order.customer.email,
    orderConfirmationEmail(order, link),
    "order_confirmation",
    `Conferma dell'ordine ${order.id} per ${order.customer.email}`,
  );
}
