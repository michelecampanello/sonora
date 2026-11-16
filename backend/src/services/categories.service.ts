import { pool } from "../lib/db.js";
import type { Category, CategoryRow } from "../types.js";

/** Le categorie principali, ognuna con le sue sottocategorie */
export async function getCategoryTree(): Promise<Category[]> {
  const { rows } = await pool.query<CategoryRow>(
    "SELECT id, name, slug, description, image_url, parent_id FROM categories ORDER BY sort_order, name"
  );

  return rows
    .filter((c) => c.parent_id === null)
    .map(({ id, name, slug, description, image_url }) => ({
      id,
      name,
      slug,
      description,
      image_url,
      children: rows
        .filter((c) => c.parent_id === id)
        .map(({ id, name, slug, description, image_url }) => ({ id, name, slug, description, image_url })),
    }));
}
