import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

// Unit tests for the pure, deterministic app logic. The `@` alias mirrors the
// tsconfig path mapping so tests can import source modules the same way the app
// does. Test files live in tests/ and are excluded from the app tsconfig/lint.
export default defineConfig({
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
  test: {
    include: ["tests/**/*.test.ts"],
    environment: "node",
  },
});
