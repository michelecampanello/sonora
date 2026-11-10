import type { CookieOptions, Request, Response } from "express";
import { asyncHandler } from "../asyncHandler.js";
import { isEmail } from "../email.js";
import { SESSION_COOKIE } from "../middleware/auth.middleware.js";
import {
  createSessionToken,
  EmailTakenError,
  registerUser,
  SESSION_MAX_AGE_MS,
  verifyCredentials,
} from "../services/auth.service.js";
import type { ApiError, AuthResponse, User } from "../types.js";

const MIN_PASSWORD_LENGTH = 8;
const MAX_PASSWORD_BYTES = 72; // bcrypt ignora tutto ciò che viene dopo il 72° byte

// httpOnly: il token non è leggibile da JavaScript. sameSite: un altro sito non può usare la sessione.
const COOKIE_OPTIONS: CookieOptions = {
  httpOnly: true,
  sameSite: "lax",
  secure: process.env.NODE_ENV === "production",
  path: "/",
};

const text = (value: unknown): string => (typeof value === "string" ? value.trim() : "");
const asRecord = (value: unknown): Record<string, unknown> =>
  typeof value === "object" && value !== null ? (value as Record<string, unknown>) : {};

function startSession(res: Response<AuthResponse | ApiError>, user: User) {
  res.cookie(SESSION_COOKIE, createSessionToken(user.id), { ...COOKIE_OPTIONS, maxAge: SESSION_MAX_AGE_MS });
}

/** POST /api/auth/register — crea un account e avvia la sessione */
export const register = asyncHandler<{}, AuthResponse | ApiError, unknown, unknown>(async (req, res) => {
  const fields = asRecord(req.body);
  const name = text(fields.name);
  const email = text(fields.email).toLowerCase();
  const password = typeof fields.password === "string" ? fields.password : "";

  if (name.length < 2 || name.length > 100) return res.status(400).json({ error: "Nome non valido" });
  if (!isEmail(email)) return res.status(400).json({ error: "Email non valida" });
  if (password.length < MIN_PASSWORD_LENGTH) {
    return res.status(400).json({ error: `La password deve avere almeno ${MIN_PASSWORD_LENGTH} caratteri` });
  }
  if (Buffer.byteLength(password) > MAX_PASSWORD_BYTES) {
    return res.status(400).json({ error: "La password è troppo lunga" });
  }

  try {
    const user = await registerUser(name, email, password);
    startSession(res, user);
    return res.status(201).json({ user });
  } catch (err) {
    if (err instanceof EmailTakenError) {
      return res.status(409).json({ error: "Esiste già un account con questa email" });
    }
    throw err;
  }
});

/** POST /api/auth/login — avvia la sessione */
export const login = asyncHandler<{}, AuthResponse | ApiError, unknown, unknown>(async (req, res) => {
  const fields = asRecord(req.body);
  const email = text(fields.email).toLowerCase();
  const password = typeof fields.password === "string" ? fields.password : "";
  if (!email || !password) return res.status(400).json({ error: "Inserisci email e password" });

  const user = await verifyCredentials(email, password);
  // Lo stesso messaggio per email e password sbagliate: non rivela quali email sono registrate
  if (!user) return res.status(401).json({ error: "Email o password non corrette" });

  startSession(res, user);
  return res.json({ user });
});

/** POST /api/auth/logout — chiude la sessione */
export const logout = (_req: Request, res: Response) => {
  res.clearCookie(SESSION_COOKIE, COOKIE_OPTIONS);
  res.json({ status: "ok" });
};

/** GET /api/auth/me — l'utente collegato */
export const me = (req: Request, res: Response<AuthResponse>) => {
  res.json({ user: req.user! });
};
