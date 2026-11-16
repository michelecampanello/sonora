import { Router } from "express";
import {
  getCheckoutResult,
  getPaymentOptions,
  postCancelPayment,
  postOrder,
} from "../controllers/orders.controller.js";
import { loadUser } from "../middleware/auth.middleware.js";

const router = Router();

router.post("/", loadUser, postOrder);
router.get("/payment-options", getPaymentOptions);
router.get("/checkout/:sessionId", getCheckoutResult);
router.post("/:id/cancel-payment", postCancelPayment);

export default router;
