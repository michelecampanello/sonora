import { pool } from "../db.js";
import type { Brand } from "../types.js";

export async function listBrands(): Promise<Brand[]> {
  const { rows } = await pool.query<Brand>("SELECT id, slug, name FROM brands ORDER BY name");
  return rows;
}

export async function findBrandBySlug(slug: string): Promise<Brand | null> {
  const { rows } = await pool.query<Brand>(
    "SELECT id, slug, name FROM brands WHERE slug = $1",
    [slug],
  );
  return rows[0] ?? null;
}
