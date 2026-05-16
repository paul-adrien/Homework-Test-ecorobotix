import path from "node:path";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      "@shared": path.resolve(__dirname, "../shared/src"),
      // Read shared straight from source so a new export lands in the test
      // run without re-syncing `node_modules/@agriwatch/shared`.
      "@agriwatch/shared": path.resolve(__dirname, "../shared/src/index.ts"),
    },
    // pnpm hoists a separate zod copy per package (api/, web/, shared/).
    // When shared is imported from source via the alias above, the zod
    // inside it resolves to a different physical path than the one tests
    // import directly — so `err instanceof ZodError` would fail. Deduping
    // collapses every "zod" import to a single module instance.
    dedupe: ["zod"],
  },
  test: {
    environment: "node",
    globals: true,
    include: ["src/**/*.test.ts", "tests/**/*.test.ts"],
  },
});
