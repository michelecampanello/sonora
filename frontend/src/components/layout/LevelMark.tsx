import type { CSSProperties } from "react";
import { cn } from "@/lib/utils";

const LEVELS = [45, 100, 65, 85, 30];

/** Il marchio di Sonora: cinque barre di livello, che si muovono al passaggio del mouse sul link */
export function LevelMark({ className }: { className?: string }) {
  return (
    <span aria-hidden className={cn("level-mark inline-flex h-5 items-center gap-0.5", className)}>
      {LEVELS.map((level, index) => (
        <span
          key={index}
          className="w-1 bg-current"
          style={{ height: `${level}%`, "--i": index } as CSSProperties}
        />
      ))}
    </span>
  );
}
