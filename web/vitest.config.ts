import path from "node:path";
import react from "@vitejs/plugin-react-swc";
import { defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      "@shared": path.resolve(__dirname, "../shared/src"),
      // Match the runtime alias from vite.config.ts — Vitest doesn't
      // inherit it (separate config file).
      "@agriwatch/shared": path.resolve(__dirname, "../shared/src/index.ts"),
    },
    // pnpm hoists a separate zod copy per package; dedupe so an `err
    // instanceof ZodError` check still holds when the schema source lives
    // under shared/ and is read through the alias above.
    dedupe: ["zod"],
  },
  test: {
    environment: "happy-dom",
    globals: true,
    setupFiles: ["./tests/setup.ts"],
    include: ["src/**/*.test.{ts,tsx}", "tests/**/*.test.{ts,tsx}"],
  },
});
