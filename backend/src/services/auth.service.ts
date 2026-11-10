import { randomBytes } from "node:crypto";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import pg from "pg";
import { pool } from "../db.js";
import type { User } from "../types.js";

const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET || JWT_SECRET.length < 32) {
  throw new Error("Variabile JWT_SECRET mancante o più corta di 32 caratteri: controlla il file .env");
}

const SESSION_DAYS = 7;
export const SESSION_MAX_AGE_MS = SESSION_DAYS * 24 * 60 * 60 * 1000;

const BCRYPT_COST = 12;
const USER_COLUMNS = "id, name, email, role";
const UNIQUE_VIOLATION = "23505";

// Confronto eseguito quando l'email non esiste: i tempi di risposta non rivelano chi è registrato.
const DUMMY_HASH = bcrypt.hashSync(randomBytes(16).toString("hex"), BCRYPT_COST);

export class EmailTakenError extends Error {}

export const hashPassword = (password: string): Promise<string> => bcrypt.hash(password, BCRYPT_COST);

interface Session {
  userId: string;
  version: number;
}

export async function registerUser(name: string, email: string, password: string): Promise<User> {
  const passwordHash = await hashPassword(password);
  try {
    const { rows } = await pool.query<User>(
      `INSERT INTO users (name, email, password_hash) VALUES ($1, $2, $3) RETURNING ${USER_COLUMNS}`,
      [name, email, passwordHash],
    );
    return rows[0]!;
  } catch (err) {
    if (err instanceof pg.DatabaseError && err.code === UNIQUE_VIOLATION) throw new EmailTakenError();
    throw err;
  }
}

/** Restituisce l'utente se le credenziali sono corrette, altrimenti null */
export async function verifyCredentials(email: string, password: string): Promise<User | null> {
  const { rows } = await pool.query<User & { password_hash: string }>(
    `SELECT ${USER_COLUMNS}, password_hash FROM users WHERE email = $1`,
    [email],
  );
  const row = rows[0];
  const matches = await bcrypt.compare(password, row?.password_hash ?? DUMMY_HASH);
  if (!row || !matches) return null;

  const { password_hash: _passwordHash, ...user } = row;
  return user;
}

/** L'utente della sessione, oppure null se l'account non esiste più o la sessione è stata invalidata */
export async function findSessionUser({ userId, version }: Session): Promise<User | null> {
  const { rows } = await pool.query<User>(
    `SELECT ${USER_COLUMNS} FROM users WHERE id = $1 AND session_version = $2`,
    [userId, version],
  );
  return rows[0] ?? null;
}

export async function isCurrentPassword(userId: string, password: string): Promise<boolean> {
  const { rows } = await pool.query<{ password_hash: string }>(
    "SELECT password_hash FROM users WHERE id = $1",
    [userId],
  );
  return bcrypt.compare(password, rows[0]?.password_hash ?? DUMMY_HASH);
}

export async function updateProfile(userId: string, name: string, email: string): Promise<User> {
  try {
    const { rows } = await pool.query<User>(
      // Cambiando email cade anche l'eventuale link di reset inviato al vecchio indirizzo
      `WITH cleared AS (
         DELETE FROM password_reset_tokens t USING users u
         WHERE t.user_id = u.id AND u.id = $1 AND u.email <> $3
       )
       UPDATE users SET name = $2, email = $3 WHERE id = $1 RETURNING ${USER_COLUMNS}`,
      [userId, name, email],
    );
    return rows[0]!;
  } catch (err) {
    if (err instanceof pg.DatabaseError && err.code === UNIQUE_VIOLATION) throw new EmailTakenError();
    throw err;
  }
}

/** Cambia la password e invalida tutte le sessioni aperte, anche su altri dispositivi */
export async function changePassword(userId: string, newPassword: string): Promise<void> {
  const passwordHash = await hashPassword(newPassword);
  await pool.query(
    `WITH cleared AS (DELETE FROM password_reset_tokens WHERE user_id = $1)
     UPDATE users SET password_hash = $2, session_version = session_version + 1 WHERE id = $1`,
    [userId, passwordHash],
  );
}

export async function createSessionToken(userId: string): Promise<string> {
  const { rows } = await pool.query<{ session_version: number }>(
    "SELECT session_version FROM users WHERE id = $1",
    [userId],
  );
  return jwt.sign({ ver: rows[0]!.session_version }, JWT_SECRET!, {
    subject: userId,
    algorithm: "HS256",
    expiresIn: `${SESSION_DAYS}d`,
  });
}

/** Legge il token, restituendo null se è falso o scaduto */
export function readSessionToken(token: string): Session | null {
  try {
    const { sub, ver } = jwt.verify(token, JWT_SECRET!, { algorithms: ["HS256"] }) as jwt.JwtPayload;
    return sub && typeof ver === "number" ? { userId: sub, version: ver } : null;
  } catch {
    return null;
  }
}
