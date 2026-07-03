import { defineConfig, devices } from "@playwright/test";

/**
 * E2E runs against a locally-started app.
 *
 * The marketing pages and unauthenticated redirect/protection behaviour need no
 * real backend, so by default the dev server boots with **placeholder** Supabase
 * env — it can never touch a real project. Auth-dependent journeys (a follow-up)
 * require a dedicated test project via E2E_SUPABASE_*; when those are set they're
 * passed through to the server instead.
 *
 * Set E2E_BASE_URL to run against an already-running/deployed instance (then no
 * server is started here).
 */
const e2eUrl = process.env.E2E_SUPABASE_URL;
const e2eAnon = process.env.E2E_SUPABASE_ANON_KEY;
const e2eService = process.env.E2E_SUPABASE_SERVICE_ROLE_KEY;
const e2eConfigured = Boolean(e2eUrl && e2eAnon && e2eService);

const serverEnv = e2eConfigured
  ? {
      NEXT_PUBLIC_SUPABASE_URL: e2eUrl!,
      NEXT_PUBLIC_SUPABASE_ANON_KEY: e2eAnon!,
      SUPABASE_SERVICE_ROLE_KEY: e2eService!,
    }
  : {
      NEXT_PUBLIC_SUPABASE_URL: "https://placeholder.supabase.co",
      NEXT_PUBLIC_SUPABASE_ANON_KEY: "placeholder-anon-key",
      SUPABASE_SERVICE_ROLE_KEY: "placeholder-service-key",
    };

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  reporter: "list",
  use: {
    baseURL: process.env.E2E_BASE_URL ?? "http://localhost:3000",
    trace: "on-first-retry",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: process.env.E2E_BASE_URL
    ? undefined
    : {
        command: "pnpm dev",
        url: "http://localhost:3000",
        reuseExistingServer: !process.env.CI,
        timeout: 120_000,
        env: serverEnv,
      },
});
