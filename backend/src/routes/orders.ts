import { Router } from "express";
import { postOrder } from "../controllers/orders.controller.js";
import { loadUser } from "../middleware/auth.middleware.js";

const router = Router();

router.post("/", loadUser, postOrder);

export default router;
