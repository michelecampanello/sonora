import { createElement } from "react";
import {
  AudioLines,
  Cable,
  Drum,
  Guitar,
  Headphones,
  Mic,
  Music,
  Piano,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";

// Finché non ci sono foto, mostriamo un'icona in base alla categoria.
const ICONS: [keyword: string, icon: LucideIcon][] = [
  ["chitarre", Guitar],
  ["bassi", Guitar],
  ["batterie", Drum],
  ["pianoforti", Piano],
  ["sintetizzatori", Piano],
  ["microfoni", Mic],
  ["cuffie", Headphones],
  ["cavi", Cable],
  ["interfacce", AudioLines],
];

function iconFor(categorySlug: string): LucideIcon {
  return ICONS.find(([keyword]) => categorySlug.includes(keyword))?.[1] ?? Music;
}

interface ProductImageProps {
  name: string;
  imageUrl: string | null;
  categorySlug: string;
  className?: string;
}

export function ProductImage({ name, imageUrl, categorySlug, className }: ProductImageProps) {
  const base = cn("aspect-square w-full rounded-md bg-muted", className);

  if (imageUrl) {
    return <img src={imageUrl} alt={name} loading="lazy" className={cn(base, "object-cover")} />;
  }

  return (
    <div className={cn(base, "flex items-center justify-center")} role="img" aria-label={name}>
      {createElement(iconFor(categorySlug), {
        className: "size-1/3 text-muted-foreground",
        strokeWidth: 1.25,
      })}
    </div>
  );
}
