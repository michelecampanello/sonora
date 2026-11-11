import type { ProductSummary } from "@/lib/types";

let counter = 0;

/** Un prodotto del catalogo per i test, con un UUID valido e diverso ogni volta */
export function makeProduct(overrides: Partial<ProductSummary> = {}): ProductSummary {
  counter += 1;
  const n = String(counter).padStart(12, "0");
  return {
    id: `00000000-0000-4000-8000-${n}`,
    slug: `prodotto-${counter}`,
    name: `Prodotto ${counter}`,
    price: "100.00",
    stock: 10,
    image_url: null,
    category: "Chitarre elettriche",
    category_slug: "chitarre-elettriche",
    brand_id: "00000000-0000-4000-8000-999999999999",
    brand_slug: "nordwood",
    brand: "Nordwood",
    ...overrides,
  };
}
