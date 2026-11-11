import { Router } from "express";
import { getBrandProducts, getBrands } from "../controllers/brands.controller.js";

const router = Router();

router.get("/", getBrands);
router.get("/:slug/products", getBrandProducts);

export default router;
