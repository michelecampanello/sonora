import nodemailer from "nodemailer";

const SMTP_URL = process.env.SMTP_URL;
const MAIL_FROM = process.env.MAIL_FROM ?? "Sonora <noreply@localhost>";

if (!SMTP_URL && process.env.NODE_ENV === "production") {
  throw new Error("Variabile SMTP_URL mancante: senza non si possono inviare le email di reset");
}

const transport = SMTP_URL ? nodemailer.createTransport(SMTP_URL) : null;

export async function sendPasswordResetEmail(to: string, link: string): Promise<void> {
  if (!transport) {
    // Solo in sviluppo: in produzione il server non parte senza SMTP_URL
    console.log(`[email non inviata, SMTP_URL assente] Reset password per ${to}: ${link}`);
    return;
  }

  await transport.sendMail({
    from: MAIL_FROM,
    to: { name: "", address: to },
    subject: "Reimposta la password di Sonora",
    text: [
      "Abbiamo ricevuto una richiesta per reimpostare la password del tuo account Sonora.",
      "",
      "Apri questo link entro un'ora per sceglierne una nuova:",
      link,
      "",
      "Se non sei stato tu, ignora questa email: la tua password non cambierà.",
    ].join("\n"),
  });
}
