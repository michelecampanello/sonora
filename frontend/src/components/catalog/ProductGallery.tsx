import { useState } from "react";
import { cn } from "@/lib/utils";
import type { ProductPhoto } from "@/lib/types";
import { ProductImage } from "./ProductImage";

interface ProductGalleryProps {
  name: string;
  categorySlug: string;
  images: ProductPhoto[];
}

/** Immagine grande con le miniature per cambiarla. Senza immagini mostra l'icona della categoria. */
export function ProductGallery({ name, categorySlug, images }: ProductGalleryProps) {
  const [selected, setSelected] = useState(0);
  const current = images[selected];

  return (
    <div className="flex min-w-0 flex-col gap-3">
      <ProductImage
        name={current?.alt ?? name}
        imageUrl={current?.url ?? null}
        categorySlug={categorySlug}
        className="rounded-xl"
      />

      {images.length > 1 && (
        <ul className="grid grid-cols-5 gap-2" aria-label="Immagini del prodotto">
          {images.map((image, index) => (
            <li key={image.id}>
              <button
                type="button"
                onClick={() => setSelected(index)}
                aria-label={`Mostra immagine ${index + 1} di ${images.length}`}
                aria-current={index === selected ? "true" : undefined}
                className={cn(
                  "block w-full overflow-hidden rounded-md border-2 border-transparent focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
                  index === selected && "border-primary"
                )}
              >
                <img src={image.url} alt="" loading="lazy" className="aspect-square w-full bg-muted object-cover" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
