import { Router } from "express";
import { pool } from "../db.js";
import { asyncHandler } from "../asyncHandler.js";
import type { ApiError, Brand, ProductSummary } from "../types.js";
import { PRODUCT_COLUMNS, PRODUCT_JOINS } from "./products.js";

const router = Router();

/** GET /api/brands — elenco marche, utile per i filtri del catalogo */
router.get(
  "/",
  asyncHandler<{}, Brand[], unknown, unknown>(async (_req, res) => {
    const { rows } = await pool.query<Brand>(
      "SELECT id, name FROM brands ORDER BY name",
    );
    res.json(rows);
  }),
);

interface BrandProducts {
  brand: Brand;
  items: ProductSummary[];
}

/** GET /api/brands/:id/products — prodotti di una marca */
router.get(
  "/:id/products",
  asyncHandler<{ id: string }, BrandProducts | ApiError, unknown, unknown>(
    async (req, res) => {
      // 1. Validazione dell'id
      const id = Number(req.params.id);
      if (!Number.isInteger(id) || id <= 0) {
        return res.status(400).json({ error: "Id non valido" });
      }

      // 2. La marca esiste?
      const brandResult = await pool.query<Brand>(
        "SELECT id, name FROM brands WHERE id = $1",
        [id],
      );
      const brand = brandResult.rows[0];
      if (!brand) {
        return res.status(404).json({ error: "Marca non trovata" });
      }

      // 3. Prodotti della marca
      const productsResult = await pool.query<ProductSummary>(
        `SELECT ${PRODUCT_COLUMNS}
       ${PRODUCT_JOINS}
       WHERE p.brand_id = $1 AND p.active
       ORDER BY p.name`,
        [id],
      );

      return res.json({ brand, items: productsResult.rows });
    },
  ),
);
export default router;
