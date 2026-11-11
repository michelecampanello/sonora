import { createHash, randomBytes } from "node:crypto";
import { FRONTEND_ORIGIN } from "../config.js";
import { pool } from "../db.js";
import { hashPassword } from "./auth.service.js";
import { sendPasswordResetEmail } from "./mail.service.js";

// Nel database resta solo l'impronta: chi leggesse la tabella non potrebbe usare i link.
const hashToken = (token: string): string => createHash("sha256").update(token).digest("hex");

/**
 * Crea un link di reset e lo invia per email; se l'email non è registrata non fa nulla.
 * Ogni utente ha un solo link valido, e ne riceve al massimo uno ogni 2 minuti.
 */
export async function requestPasswordReset(email: string): Promise<void> {
  const { rows: users } = await pool.query<{ id: string }>("SELECT id FROM users WHERE email = $1", [email]);
  const user = users[0];
  if (!user) return;

  const token = randomBytes(32).toString("hex");
  const { rowCount } = await pool.query(
    `INSERT INTO password_reset_tokens (user_id, token_hash, expires_at)
     VALUES ($1, $2, now() + interval '1 hour')
     ON CONFLICT (user_id) DO UPDATE
       SET token_hash = EXCLUDED.token_hash, expires_at = EXCLUDED.expires_at, created_at = now()
       WHERE password_reset_tokens.created_at < now() - interval '2 minutes'`,
    [user.id, hashToken(token)],
  );
  if (!rowCount) return;

  try {
    // Il token sta dopo il #: i browser non lo inviano ai server, quindi non finisce nei log
    await sendPasswordResetEmail(email, `${FRONTEND_ORIGIN}/reimposta-password#token=${token}`);
  } catch (err) {
    // L'email non è partita: si toglie il link, altrimenti l'attesa di 2 minuti impedirebbe di chiederne un altro.
    // Solo se è ancora questo: nel frattempo potrebbe esserne stato creato uno nuovo.
    await pool.query("DELETE FROM password_reset_tokens WHERE token_hash = $1", [hashToken(token)]);
    throw err;
  }
}

/**
 * Imposta la nuova password e chiude tutte le sessioni aperte.
 * Restituisce false se il link non è valido, è scaduto o è già stato usato.
 */
export async function resetPassword(token: string, newPassword: string): Promise<boolean> {
  const passwordHash = await hashPassword(newPassword);
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    // DELETE e non SELECT: due richieste simultanee con lo stesso link non possono riuscire entrambe
    const { rows } = await client.query<{ user_id: string }>(
      "DELETE FROM password_reset_tokens WHERE token_hash = $1 AND expires_at > now() RETURNING user_id",
      [hashToken(token)],
    );
    const consumed = rows[0];
    if (!consumed) {
      await client.query("ROLLBACK");
      return false;
    }

    await client.query(
      "UPDATE users SET password_hash = $2, session_version = session_version + 1 WHERE id = $1",
      [consumed.user_id, passwordHash],
    );
    await client.query("COMMIT");
    return true;
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
}
