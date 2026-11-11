import { asyncHandler } from "../asyncHandler.js";
import { isSlug } from "../slug.js";
import { findBrandBySlug, listBrands } from "../services/brands.service.js";
import { listProductsByBrand } from "../services/products.service.js";
import type { ApiError, Brand, ProductSummary } from "../types.js";

interface BrandProducts {
  brand: Brand;
  items: ProductSummary[];
}

/** GET /api/brands — elenco marche, utile per i filtri del catalogo */
export const getBrands = asyncHandler<{}, Brand[], unknown, unknown>(async (_req, res) => {
  res.json(await listBrands());
});

/** GET /api/brands/:slug/products — prodotti di una marca */
export const getBrandProducts = asyncHandler<{ slug: string }, BrandProducts | ApiError, unknown, unknown>(
  async (req, res) => {
    const { slug } = req.params;
    if (!isSlug(slug)) {
      return res.status(404).json({ error: "Marca non trovata" });
    }

    const brand = await findBrandBySlug(slug);
    if (!brand) {
      return res.status(404).json({ error: "Marca non trovata" });
    }

    return res.json({ brand, items: await listProductsByBrand(brand.id) });
  },
);
