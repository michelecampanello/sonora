import { Router } from "express";
import { forgotPassword, login, logout, me, register, resetPassword } from "../controllers/auth.controller.js";
import { loadUser, requireAuth } from "../middleware/auth.middleware.js";
import { failedAttemptsLimiter, passwordResetRequestLimiter, registrationLimiter } from "../middleware/rateLimit.js";

const router = Router();

router.post("/register", registrationLimiter(), register);
router.post("/login", failedAttemptsLimiter(), login);
router.post("/logout", logout);
router.post("/forgot-password", passwordResetRequestLimiter(), forgotPassword);
router.post("/reset-password", failedAttemptsLimiter(), resetPassword);
router.get("/me", loadUser, requireAuth, me);

export default router;
