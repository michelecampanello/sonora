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
import { SoundSignature } from "./SoundSignature";

// Finché non ci sono foto, mostriamo la firma sonora del prodotto e un'icona in base alla categoria.
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
    <div className={cn(base, "relative overflow-hidden")} role="img" aria-label={name}>
      <SoundSignature seed={name} className="absolute inset-x-[8%] inset-y-[20%] h-[60%] w-[84%] text-primary" />
      {createElement(iconFor(categorySlug), {
        className: "absolute top-[7%] left-[8%] size-[11%] text-muted-foreground",
        strokeWidth: 1.25,
      })}
    </div>
  );
}
