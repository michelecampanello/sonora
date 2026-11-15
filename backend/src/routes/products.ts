import { Router } from "express";
import { getProduct, getProducts } from "../controllers/products.controller.js";
import { deleteMyReview, getReviews, putMyReview } from "../controllers/reviews.controller.js";
import { loadUser, requireAuth } from "../middleware/auth.middleware.js";

const router = Router();

router.get("/", getProducts);
router.get("/:slug", getProduct);

// Le recensioni le legge chiunque; scriverle e cancellarle richiede l'accesso
router.get("/:slug/reviews", loadUser, getReviews);
router.put("/:slug/reviews/mine", loadUser, requireAuth, putMyReview);
router.delete("/:slug/reviews/mine", loadUser, requireAuth, deleteMyReview);

export default router;
