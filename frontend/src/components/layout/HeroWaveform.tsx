import { useEffect, useRef } from "react";
import { cn } from "@/lib/utils";

const STEP = 7; // distanza tra le barre, in pixel
const BAR_WIDTH = 3;
const REACH = 150; // raggio d'azione del puntatore, in pixel

/**
 * Forma d'onda del banner: respira da sola e si accende vicino al puntatore.
 * Su touch, dove il puntatore non c'è, il punto acceso vaga da solo.
 * I colori arrivano dal CSS: `color` per le barre spente, `--signal` per quelle accese.
 */
export function HeroWaveform({ className }: { className?: string }) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    const context = canvas?.getContext("2d");
    if (!canvas || !context) return;

    const styles = getComputedStyle(canvas);
    const idleColor = styles.color;
    const hotColor = styles.getPropertyValue("--signal").trim();
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    let width = 0;
    let height = 0;
    let frame = 0;
    let pointerX: number | null = null;
    let hotX = 0;

    const draw = (time: number) => {
      const t = time / 1000;
      const wanderX = width * (0.5 + 0.4 * Math.sin(t * 0.45));
      hotX += ((pointerX ?? wanderX) - hotX) * 0.12;

      context.clearRect(0, 0, width, height);
      const middle = height / 2;

      for (let x = 0; x < width; x += STEP) {
        const wave =
          0.42 * Math.abs(Math.sin(x * 0.011 + t * 0.7)) +
          0.33 * Math.abs(Math.sin(x * 0.037 - t * 1.1)) +
          0.25 * Math.abs(Math.sin(x * 0.083 + t * 1.9));
        const distance = Math.abs(x - hotX);
        const boost = Math.exp(-(distance * distance) / (2 * REACH * REACH));
        const amplitude = Math.min(1, 0.12 + wave * (0.42 + boost * 0.6));
        const bar = Math.max(2, amplitude * height);

        context.globalAlpha = boost > 0.3 ? 1 : 0.4;
        context.fillStyle = boost > 0.3 ? hotColor : idleColor;
        context.fillRect(x, middle - bar / 2, BAR_WIDTH, bar);
      }
    };

    const loop = (time: number) => {
      draw(time);
      frame = requestAnimationFrame(loop);
    };
    const stop = () => cancelAnimationFrame(frame);
    const start = () => {
      stop();
      if (reducedMotion) draw(0);
      else frame = requestAnimationFrame(loop);
    };

    const resize = () => {
      const ratio = window.devicePixelRatio || 1;
      width = canvas.clientWidth;
      height = canvas.clientHeight;
      canvas.width = width * ratio;
      canvas.height = height * ratio;
      context.setTransform(ratio, 0, 0, ratio, 0, 0);
      hotX = width / 2;
      if (reducedMotion) draw(0);
    };

    const onPointerMove = (event: PointerEvent) => {
      if (event.pointerType !== "mouse") return;
      const rect = canvas.getBoundingClientRect();
      const inside = event.clientY >= rect.top - 400 && event.clientY <= rect.bottom;
      pointerX = inside ? event.clientX - rect.left : null;
    };

    // Niente animazione mentre il banner è fuori dallo schermo
    const visibility = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) start();
      else stop();
    });
    const sizing = new ResizeObserver(resize);

    resize();
    sizing.observe(canvas);
    visibility.observe(canvas);
    window.addEventListener("pointermove", onPointerMove);

    return () => {
      stop();
      sizing.disconnect();
      visibility.disconnect();
      window.removeEventListener("pointermove", onPointerMove);
    };
  }, []);

  return <canvas ref={ref} aria-hidden className={cn("block w-full", className)} />;
}
