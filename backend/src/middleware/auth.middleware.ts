import type { RequestHandler } from "express";
import { findSessionUser, readSessionToken } from "../services/auth.service.js";
import type { User } from "../types.js";

declare global {
  namespace Express {
    interface Request {
      /** L'utente collegato, se la richiesta ha una sessione valida */
      user?: User;
    }
  }
}

export const SESSION_COOKIE = "sonora_session";

/**
 * Riconosce l'utente dal cookie di sessione, senza bloccare chi non è collegato.
 * L'utente si rilegge dal database: un token ancora valido può riferirsi a un account
 * che non esiste più, per esempio dopo aver rilanciato il seed, o a una password già cambiata.
 */
export const loadUser: RequestHandler<any, any, any, any> = (req, _res, next) => {
  const token: unknown = req.cookies?.[SESSION_COOKIE];
  const session = typeof token === "string" ? readSessionToken(token) : null;
  if (!session) {
    next();
    return;
  }

  findSessionUser(session)
    .then((user) => {
      if (user) req.user = user;
      next();
    })
    .catch(next);
};

/** Da usare dopo loadUser sulle rotte riservate a chi ha fatto l'accesso */
export const requireAuth: RequestHandler<any, any, any, any> = (req, res, next) => {
  if (!req.user) {
    res.status(401).json({ error: "Accesso richiesto" });
    return;
  }
  next();
};
