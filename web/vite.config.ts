import path from "node:path";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react-swc";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      "@shared": path.resolve(__dirname, "../shared/src"),
      // Bypass node_modules/@agriwatch/shared so Vite reads the TS source
      // straight from ../shared/src. Without this Vite pre-bundles the
      // package into .vite/deps and a new export added to shared/ doesn't
      // surface until the cache is purged (`rm -rf .vite/deps && pnpm i`).
      // The `file:` dep in package.json stays so `pnpm install` still
      // creates the symlink for tooling that doesn't go through Vite.
      "@agriwatch/shared": path.resolve(__dirname, "../shared/src/index.ts"),
    },
    // pnpm hoists a separate zod copy per package; dedupe so the schema
    // module under shared/ and the zod imports under web/ share the same
    // class instance (otherwise `instanceof ZodError` would fail at
    // runtime when the schema and the consumer aren't the same physical
    // file).
    dedupe: ["zod"],
  },
  server: {
    port: 5173,
    proxy: {
      "/api": {
        target: "http://localhost:3000",
        changeOrigin: true,
      },
    },
  },
});
