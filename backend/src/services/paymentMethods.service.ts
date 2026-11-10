import { pool } from "../db.js";
import type { PaymentMethod } from "../types.js";
import { deleteRecord, reserveRecordSlot, setDefaultRecord, withUserLock } from "./savedRecords.js";

export type PaymentMethodFields = Omit<PaymentMethod, "id" | "is_default">;

export async function listPaymentMethods(userId: string): Promise<PaymentMethod[]> {
  const { rows } = await pool.query<PaymentMethod>(
    `SELECT id, brand, last4, holder, exp_month, exp_year, is_default
     FROM payment_methods WHERE user_id = $1
     ORDER BY is_default DESC, created_at DESC, id`,
    [userId],
  );
  return rows;
}

/** Lancia RecordLimitError se l'utente ha già troppi metodi di pagamento */
export async function createPaymentMethod(userId: string, fields: PaymentMethodFields): Promise<void> {
  await withUserLock(userId, async (client) => {
    const isDefault = await reserveRecordSlot(client, "payment_methods", userId);
    await client.query(
      `INSERT INTO payment_methods (user_id, brand, last4, holder, exp_month, exp_year, is_default)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [userId, fields.brand, fields.last4, fields.holder, fields.exp_month, fields.exp_year, isDefault],
    );
  });
}

export const deletePaymentMethod = (userId: string, id: string) => deleteRecord("payment_methods", userId, id);
export const setDefaultPaymentMethod = (userId: string, id: string) => setDefaultRecord("payment_methods", userId, id);
