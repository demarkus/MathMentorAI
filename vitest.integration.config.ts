import { defineConfig } from "vitest/config";

// Integration tests hit a LIVE, dedicated test Supabase project (never prod).
// They are gated on INTEGRATION_SUPABASE_* env vars and skip when absent, so
// `pnpm test` (the offline unit suite) never runs them. Run with:
//   pnpm test:integration
export default defineConfig({
  test: {
    include: ["tests/integration/**/*.test.ts"],
    environment: "node",
    testTimeout: 30_000,
    hookTimeout: 30_000,
    // Serial: these create/delete real auth users; avoid rate limits and races.
    fileParallelism: false,
  },
});
