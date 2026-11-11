import { pool } from "../db.js";
import type { Address } from "../types.js";
import type { LocationFields } from "../validation.js";
import { deleteRecord, reserveRecordSlot, setDefaultRecord, withUserLock } from "./savedRecords.js";

export interface AddressFields extends LocationFields {
  name: string;
}

export async function listAddresses(userId: string): Promise<Address[]> {
  const { rows } = await pool.query<Address>(
    `SELECT id, name, address, city, postal_code, province, is_default
     FROM addresses WHERE user_id = $1
     ORDER BY is_default DESC, created_at DESC, id`,
    [userId],
  );
  return rows;
}

/** Lancia RecordLimitError se l'utente ha già troppi indirizzi */
export async function createAddress(userId: string, fields: AddressFields): Promise<void> {
  await withUserLock(userId, async (client) => {
    const isDefault = await reserveRecordSlot(client, "addresses", userId);
    await client.query(
      `INSERT INTO addresses (user_id, name, address, city, postal_code, province, is_default)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [userId, fields.name, fields.address, fields.city, fields.postal_code, fields.province, isDefault],
    );
  });
}

/** Restituisce false se l'indirizzo non esiste o appartiene a un altro utente */
export async function updateAddress(userId: string, id: string, fields: AddressFields): Promise<boolean> {
  const { rowCount } = await pool.query(
    `UPDATE addresses SET name = $3, address = $4, city = $5, postal_code = $6, province = $7
     WHERE id = $1 AND user_id = $2`,
    [id, userId, fields.name, fields.address, fields.city, fields.postal_code, fields.province],
  );
  return rowCount === 1;
}

export const deleteAddress = (userId: string, id: string) => deleteRecord("addresses", userId, id);
export const setDefaultAddress = (userId: string, id: string) => setDefaultRecord("addresses", userId, id);
