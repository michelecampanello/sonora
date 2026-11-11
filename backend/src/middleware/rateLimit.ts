import rateLimit from "express-rate-limit";

const LIMIT_OPTIONS = {
  standardHeaders: "draft-8",
  legacyHeaders: false,
  message: { error: "Troppi tentativi, riprova più tardi" },
} as const;

/** Contro i tentativi di indovinare una password: contano solo le richieste fallite */
export const failedAttemptsLimiter = () =>
  rateLimit({ ...LIMIT_OPTIONS, windowMs: 15 * 60 * 1000, limit: 10, skipSuccessfulRequests: true });

/** Contro l'invio massivo di email a indirizzi altrui */
export const passwordResetRequestLimiter = () =>
  rateLimit({ ...LIMIT_OPTIONS, windowMs: 60 * 60 * 1000, limit: 5 });

export const registrationLimiter = () =>
  rateLimit({ ...LIMIT_OPTIONS, windowMs: 60 * 60 * 1000, limit: 10 });
