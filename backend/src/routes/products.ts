import { Router } from "express";
import { getProduct, getProducts } from "../controllers/products.controller.js";

const router = Router();

router.get("/", getProducts);
router.get("/:slug", getProduct);

export default router;
