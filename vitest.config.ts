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
    // Unit tests only (top-level tests/). Integration tests under
    // tests/integration/ have their own config (vitest.integration.config.ts).
    include: ["tests/*.test.ts"],
    environment: "node",
  },
});
