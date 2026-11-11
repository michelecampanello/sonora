// Regole comuni a indirizzi e metodi di pagamento: un limite per utente e un solo elemento predefinito.
import type { PoolClient } from "pg";
import { pool } from "../db.js";

/** I nomi vengono inseriti nelle query: devono restare costanti scritte nel codice */
type RecordTable = "addresses" | "payment_methods";

const MAX_RECORDS_PER_USER = 10;

export class RecordLimitError extends Error {}

/**
 * Esegue fn in una transazione bloccando la riga dell'utente: due richieste
 * simultanee dello stesso utente non possono superare il limite o creare due predefiniti.
 */
export async function withUserLock<T>(userId: string, fn: (client: PoolClient) => Promise<T>): Promise<T> {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await client.query("SELECT 1 FROM users WHERE id = $1 FOR UPDATE", [userId]);
    const result = await fn(client);
    await client.query("COMMIT");
    return result;
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
}

/** Da chiamare prima di un inserimento: true se il nuovo elemento deve essere il predefinito */
export async function reserveRecordSlot(client: PoolClient, table: RecordTable, userId: string): Promise<boolean> {
  const { rows } = await client.query<{ count: number }>(
    `SELECT COUNT(*)::int AS count FROM ${table} WHERE user_id = $1`,
    [userId],
  );
  const count = rows[0]!.count;
  if (count >= MAX_RECORDS_PER_USER) throw new RecordLimitError();
  return count === 0;
}

/** Restituisce false se l'elemento non esiste o appartiene a un altro utente */
export function setDefaultRecord(table: RecordTable, userId: string, id: string): Promise<boolean> {
  return withUserLock(userId, async (client) => {
    const { rowCount } = await client.query(`SELECT 1 FROM ${table} WHERE id = $1 AND user_id = $2`, [id, userId]);
    if (!rowCount) return false;
    await client.query(`UPDATE ${table} SET is_default = false WHERE user_id = $1 AND is_default`, [userId]);
    await client.query(`UPDATE ${table} SET is_default = true WHERE id = $1`, [id]);
    return true;
  });
}

/** Se si elimina il predefinito, il suo posto passa all'elemento più recente. False se non esiste. */
export function deleteRecord(table: RecordTable, userId: string, id: string): Promise<boolean> {
  return withUserLock(userId, async (client) => {
    const { rows } = await client.query<{ is_default: boolean }>(
      `DELETE FROM ${table} WHERE id = $1 AND user_id = $2 RETURNING is_default`,
      [id, userId],
    );
    const deleted = rows[0];
    if (!deleted) return false;
    if (deleted.is_default) {
      await client.query(
        `UPDATE ${table} SET is_default = true
         WHERE id = (SELECT id FROM ${table} WHERE user_id = $1 ORDER BY created_at DESC, id LIMIT 1)`,
        [userId],
      );
    }
    return true;
  });
}
