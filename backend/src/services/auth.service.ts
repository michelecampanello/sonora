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

export async function registerUser(name: string, email: string, password: string): Promise<User> {
  const passwordHash = await bcrypt.hash(password, BCRYPT_COST);
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

export async function findUserById(id: string): Promise<User | null> {
  const { rows } = await pool.query<User>(`SELECT ${USER_COLUMNS} FROM users WHERE id = $1`, [id]);
  return rows[0] ?? null;
}

export function createSessionToken(userId: string): string {
  return jwt.sign({}, JWT_SECRET!, { subject: userId, algorithm: "HS256", expiresIn: `${SESSION_DAYS}d` });
}

/** Restituisce l'id dell'utente, oppure null se il token è falso o scaduto */
export function readSessionToken(token: string): string | null {
  try {
    const { sub } = jwt.verify(token, JWT_SECRET!, { algorithms: ["HS256"] }) as jwt.JwtPayload;
    return sub ?? null;
  } catch {
    return null;
  }
}
