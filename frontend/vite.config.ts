   import path from "node:path";
   import { defineConfig } from "vite";
   import react, { reactCompilerPreset } from "@vitejs/plugin-react";
   import babel  from "@rolldown/plugin-babel";
   import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  plugins: [
    babel({ include: /\.[jt]sx?$/, presets: [reactCompilerPreset()]}),
    react(),
    tailwindcss()
  ],
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "./src"),
    },
  },
  server: {
    proxy: {
      "/api": "http://localhost:3000",
    },
  },
})
