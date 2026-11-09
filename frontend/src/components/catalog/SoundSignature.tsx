import type { CSSProperties } from "react";
import { cn } from "@/lib/utils";

const BARS = 40;

/** Altezze delle barre (da 0 a 1), sempre uguali per lo stesso testo */
function barsFor(seed: string): number[] {
  let hash = 2166136261;
  for (const char of seed) hash = Math.imul(hash ^ char.charCodeAt(0), 16777619);
  hash |= 1; // xorshift resterebbe fermo su zero

  return Array.from({ length: BARS }, (_, index) => {
    hash ^= hash << 13;
    hash ^= hash >>> 17;
    hash ^= hash << 5;
    const random = (hash >>> 0) / 4294967295;
    const envelope = 0.35 + 0.65 * Math.sin((index / (BARS - 1)) * Math.PI);
    return Math.max(0.06, (0.25 + 0.75 * random) * envelope);
  });
}

/** La "firma sonora" di un prodotto: una forma d'onda unica ricavata dal suo nome */
export function SoundSignature({ seed, className }: { seed: string; className?: string }) {
  return (
    <svg
      aria-hidden
      viewBox={`0 0 ${BARS * 2} 100`}
      preserveAspectRatio="none"
      className={cn("sound-signature fill-current", className)}
    >
      {barsFor(seed).map((height, index) => (
        <rect
          key={index}
          x={index * 2 + 0.5}
          y={50 - height * 50}
          width={1}
          height={height * 100}
          style={{ "--i": index } as CSSProperties}
        />
      ))}
    </svg>
  );
}
