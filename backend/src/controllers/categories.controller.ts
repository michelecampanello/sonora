import { asyncHandler } from "../asyncHandler.js";
import { getCategoryTree } from "../services/categories.service.js";
import type { Category } from "../types.js";

/**
 * GET /api/categories
 * Restituisce le categorie principali, ognuna con le sue sottocategorie:
 * [{ id, name, slug, description, children: [{ id, name, slug, description }] }]
 */
export const getCategories = asyncHandler<{}, Category[], unknown, unknown>(async (_req, res) => {
  res.json(await getCategoryTree());
});
