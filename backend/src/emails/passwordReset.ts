// Il contenuto dell'email di reset, separato dall'invio: si può leggere e provare senza Resend.

export interface EmailContent {
  subject: string;
  html: string;
  text: string;
}

/** Rende un testo sicuro da inserire nell'HTML, anche dentro un attributo */
const escapeHtml = (value: string): string =>
  value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");

export function passwordResetEmail(link: string): EmailContent {
  const safeLink = escapeHtml(link);

  // Stili scritti sugli elementi e layout a tabella: molti client di posta ignorano <style> e flexbox
  const html = `<!doctype html>
<html lang="it">
  <body style="margin:0;padding:24px;background:#f4f1ea;font-family:Helvetica,Arial,sans-serif;color:#1c1b19">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;margin:0 auto;background:#ffffff;border:1px solid #e2ddd2">
      <tr>
        <td style="padding:32px">
          <p style="margin:0 0 24px;font-size:22px;font-weight:bold;letter-spacing:-0.02em">Sonora</p>
          <p style="margin:0 0 16px;font-size:16px;line-height:1.5">Abbiamo ricevuto una richiesta per reimpostare la password del tuo account.</p>
          <p style="margin:0 0 24px;font-size:16px;line-height:1.5">Il link vale <strong>un'ora</strong> e si può usare una volta sola.</p>
          <p style="margin:0 0 24px">
            <a href="${safeLink}" style="display:inline-block;padding:12px 20px;background:#1c1b19;color:#ffffff;text-decoration:none;font-size:16px;font-weight:bold">Scegli una nuova password</a>
          </p>
          <p style="margin:0 0 8px;font-size:13px;line-height:1.5;color:#6b675e">Se il pulsante non funziona, copia questo indirizzo nel browser:</p>
          <p style="margin:0 0 24px;font-size:13px;line-height:1.5;word-break:break-all"><a href="${safeLink}" style="color:#1c1b19">${safeLink}</a></p>
          <p style="margin:0;font-size:13px;line-height:1.5;color:#6b675e">Se non sei stato tu, ignora questa email: la tua password non cambierà.</p>
        </td>
      </tr>
    </table>
  </body>
</html>`;

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
