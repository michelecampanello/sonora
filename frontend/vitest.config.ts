import { defineConfig, mergeConfig } from "vitest/config";
import viteConfig from "./vite.config.ts";

// Riusa la configurazione di Vite (alias "@", plugin React) e aggiunge solo quella dei test
export default mergeConfig(
  viteConfig,
  defineConfig({
    test: {
      environment: "jsdom",
      setupFiles: ["src/test/setup.ts"],
      include: ["src/**/*.test.{ts,tsx}"],
    },
  }),
);
