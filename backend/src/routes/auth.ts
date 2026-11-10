import { Router } from "express";
import rateLimit from "express-rate-limit";
import { login, logout, me, register } from "../controllers/auth.controller.js";
import { loadUser, requireAuth } from "../middleware/auth.middleware.js";

const LIMIT_OPTIONS = {
  standardHeaders: "draft-8",
  legacyHeaders: false,
  message: { error: "Troppi tentativi, riprova più tardi" },
} as const;

// Contro i tentativi di indovinare le password contano solo gli accessi falliti
const loginLimiter = rateLimit({ ...LIMIT_OPTIONS, windowMs: 15 * 60 * 1000, limit: 10, skipSuccessfulRequests: true });
const registerLimiter = rateLimit({ ...LIMIT_OPTIONS, windowMs: 60 * 60 * 1000, limit: 10 });

const router = Router();

router.post("/register", registerLimiter, register);
router.post("/login", loginLimiter, login);
router.post("/logout", logout);
router.get("/me", loadUser, requireAuth, me);

export default router;
