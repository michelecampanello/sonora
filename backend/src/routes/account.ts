import { Router } from "express";
import { getOrder, getOrders, patchProfile, putPassword } from "../controllers/account.controller.js";
import {
  getAddresses,
  makeAddressDefault,
  postAddress,
  putAddress,
  removeAddress,
} from "../controllers/addresses.controller.js";
import {
  getPaymentMethods,
  makePaymentMethodDefault,
  postPaymentMethod,
  removePaymentMethod,
} from "../controllers/paymentMethods.controller.js";
import { loadUser, requireAuth } from "../middleware/auth.middleware.js";
import { failedAttemptsLimiter } from "../middleware/rateLimit.js";

const router = Router();

// Tutte le rotte sono riservate a chi ha fatto l'accesso
router.use(loadUser, requireAuth);

router.get("/orders", getOrders);
router.get("/orders/:id", getOrder);

// Limitate perché verificano la password attuale
const passwordCheckLimiter = failedAttemptsLimiter();
router.patch("/profile", passwordCheckLimiter, patchProfile);
router.put("/password", passwordCheckLimiter, putPassword);

router.get("/addresses", getAddresses);
router.post("/addresses", postAddress);
router.put("/addresses/:id", putAddress);
router.delete("/addresses/:id", removeAddress);
router.post("/addresses/:id/default", makeAddressDefault);

router.get("/payment-methods", getPaymentMethods);
router.post("/payment-methods", postPaymentMethod);
router.delete("/payment-methods/:id", removePaymentMethod);
router.post("/payment-methods/:id/default", makePaymentMethodDefault);

export default router;
