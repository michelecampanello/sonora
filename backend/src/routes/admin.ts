import { Router } from "express";
import { getAdminOrder, getAdminOrders, getAdminStats, patchOrderStatus } from "../controllers/admin.controller.js";
import {
  getAdminProduct,
  getAdminProducts,
  patchProduct,
  postProduct,
  putProduct,
} from "../controllers/adminProducts.controller.js";
import { loadUser, requireAdmin, requireAuth } from "../middleware/auth.middleware.js";

const router = Router();

// Tutte le rotte: prima chi sei (401 se nessuno), poi se puoi (403 se non sei admin)
router.use(loadUser, requireAuth, requireAdmin);

router.get("/stats", getAdminStats);

router.get("/orders", getAdminOrders);
router.get("/orders/:id", getAdminOrder);
router.patch("/orders/:id/status", patchOrderStatus);

router.get("/products", getAdminProducts);
router.post("/products", postProduct);
router.get("/products/:id", getAdminProduct);
router.put("/products/:id", putProduct); // tutti i dati, dal form di modifica
router.patch("/products/:id", patchProduct); // solo alcuni campi, dall'elenco

export default router;
