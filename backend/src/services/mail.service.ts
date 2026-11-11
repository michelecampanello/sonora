import { Resend } from "resend";
import { passwordResetEmail } from "../emails/passwordReset.js";

const RESEND_API_KEY = process.env.RESEND_API_KEY;
const MAIL_FROM = process.env.MAIL_FROM;

// In produzione servono entrambi: senza chiave le email non partono, e il mittente
// deve avere un dominio verificato su Resend (l'indirizzo di prova non va bene).
if (process.env.NODE_ENV === "production" && (!RESEND_API_KEY || !MAIL_FROM)) {
  throw new Error("Variabili RESEND_API_KEY e MAIL_FROM obbligatorie in produzione: senza non si possono inviare le email di reset");
}

const resend = RESEND_API_KEY ? new Resend(RESEND_API_KEY) : null;
// In sviluppo, con la chiave ma senza un dominio verificato, si usa il mittente di prova di Resend
// || e non ??: anche una riga "MAIL_FROM=" lasciata vuota nel file .env vale come assente
const from = MAIL_FROM || "Sonora <onboarding@resend.dev>";

/** L'email non è partita: il messaggio spiega perché, per i log del server */
export class MailError extends Error {}

/** Invia il link di reset. Lancia MailError se Resend rifiuta l'invio. */
export async function sendPasswordResetEmail(to: string, link: string): Promise<void> {
  if (!resend) {
    // Solo in sviluppo: in produzione il server non parte senza RESEND_API_KEY
    console.log(`[email non inviata, RESEND_API_KEY assente] Reset password per ${to}: ${link}`);
    return;
  }

  const { subject, html, text } = passwordResetEmail(link);
  // L'SDK non lancia eccezioni per gli errori dell'API: li restituisce in `error`, e vanno controllati
  const { error } = await resend.emails.send({ from, to, subject, html, text, tags: [{ name: "type", value: "password_reset" }] });
  if (error) {
    throw new MailError(`Invio con Resend non riuscito (${error.name}${error.statusCode ? `, ${error.statusCode}` : ""}): ${error.message}`);
  }
}
