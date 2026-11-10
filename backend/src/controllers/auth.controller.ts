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
import { asRecord, isPersonName, passwordError, text } from "../validation.js";
import { requestPasswordReset, resetPassword as applyPasswordReset } from "../services/passwordReset.service.js";
import type { ApiError, AuthResponse, User } from "../types.js";

// httpOnly: il token non è leggibile da JavaScript. sameSite: un altro sito non può usare la sessione.
const COOKIE_OPTIONS: CookieOptions = {
  httpOnly: true,
  sameSite: "lax",
  secure: process.env.NODE_ENV === "production",
  path: "/",
};

export async function startSession(res: Response<any>, user: User) {
  res.cookie(SESSION_COOKIE, await createSessionToken(user.id), { ...COOKIE_OPTIONS, maxAge: SESSION_MAX_AGE_MS });
}

/** POST /api/auth/register — crea un account e avvia la sessione */
export const register = asyncHandler<{}, AuthResponse | ApiError, unknown, unknown>(async (req, res) => {
  const fields = asRecord(req.body);
  const name = text(fields.name);
  const email = text(fields.email).toLowerCase();
  const password = typeof fields.password === "string" ? fields.password : "";

  if (!isPersonName(name)) return res.status(400).json({ error: "Nome non valido" });
  if (!isEmail(email)) return res.status(400).json({ error: "Email non valida" });
  const invalidPassword = passwordError(password);
  if (invalidPassword) return res.status(400).json({ error: invalidPassword });

  try {
    const user = await registerUser(name, email, password);
    await startSession(res, user);
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

  await startSession(res, user);
  return res.json({ user });
});

/** POST /api/auth/forgot-password — invia il link di reset, se l'email è registrata */
export const forgotPassword = asyncHandler<{}, { status: string } | ApiError, unknown, unknown>(async (req, res) => {
  const email = text(asRecord(req.body).email).toLowerCase();
  if (!isEmail(email)) return res.status(400).json({ error: "Email non valida" });

  // Si risponde prima di lavorare: nemmeno i tempi di risposta rivelano se l'email è registrata
  res.json({ status: "ok" });
  requestPasswordReset(email).catch((err: unknown) => console.error(err));
  return undefined;
});

/** POST /api/auth/reset-password — imposta la nuova password usando il link ricevuto */
export const resetPassword = asyncHandler<{}, { status: string } | ApiError, unknown, unknown>(async (req, res) => {
  const fields = asRecord(req.body);
  const token = text(fields.token);
  const newPassword = typeof fields.newPassword === "string" ? fields.newPassword : "";

  const invalid = passwordError(newPassword);
  if (invalid) return res.status(400).json({ error: invalid });
  if (!/^[0-9a-f]{64}$/.test(token) || !(await applyPasswordReset(token, newPassword))) {
    return res.status(400).json({ error: "Il link non è valido o è scaduto" });
  }

  return res.json({ status: "ok" });
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
