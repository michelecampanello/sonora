import { Router } from "express";
import { pool } from "../db.js";
import { asyncHandler } from "../asyncHandler.js";
import type { Category, CategoryRow } from "../types.js";

const router = Router();

/**
 * GET /api/categories
 * Restituisce le categorie principali, ognuna con le sue sottocategorie:
 * [{ id, name, slug, description, children: [{ id, name, slug, description }] }]
 */
router.get(
  "/",
  asyncHandler<{}, Category[], unknown, unknown>(async (_req, res) => {
    const { rows } = await pool.query<CategoryRow>(
      "SELECT id, name, slug, description, parent_id FROM categories ORDER BY sort_order, name"
    );

    const tree: Category[] = rows
      .filter((c) => c.parent_id === null)
      .map(({ id, name, slug, description }) => ({
        id,
        name,
        slug,
        description,
        children: rows
          .filter((c) => c.parent_id === id)
          .map(({ id, name, slug, description }) => ({ id, name, slug, description })),
      }));

    res.json(tree);
  })
);

export default router;
