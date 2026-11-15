// Il contenuto dell'email di reset, separato dall'invio: si può leggere e provare senza Resend.
import { button, emailLayout, paragraph, type EmailContent } from "./layout.js";

export function passwordResetEmail(link: string): EmailContent {
  const html = emailLayout(
    [
      paragraph("Abbiamo ricevuto una richiesta per reimpostare la password del tuo account."),
      paragraph("Il link vale <strong>un'ora</strong> e si può usare una volta sola."),
      button(link, "Scegli una nuova password"),
    ].join("\n          "),
    "Se non sei stato tu, ignora questa email: la tua password non cambierà.",
  );

  const text = [
    "Abbiamo ricevuto una richiesta per reimpostare la password del tuo account Sonora.",
    "",
    "Apri questo link entro un'ora per sceglierne una nuova (vale una volta sola):",
    link,
    "",
    "Se non sei stato tu, ignora questa email: la tua password non cambierà.",
  ].join("\n");

  return { subject: "Reimposta la password di Sonora", html, text };
}
