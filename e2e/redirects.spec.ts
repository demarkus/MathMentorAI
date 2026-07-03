import { test, expect } from "@playwright/test";

// Verifies the middleware guard and the legacy-route redirects without any
// session. No real backend needed: with no auth cookie the proxy has no claims
// and redirects, regardless of the (placeholder) Supabase keys.
test.describe("routing & protection", () => {
  test("unauthenticated protected routes redirect to sign-in", async ({ page }) => {
    for (const path of ["/learner", "/parent", "/teacher", "/admin", "/dashboard", "/onboarding"]) {
      await page.goto(path);
      await expect(page, `expected ${path} to redirect to sign-in`).toHaveURL(/\/auth\/sign-in/);
    }
  });

  test("legacy auth routes redirect to canonical paths", async ({ page }) => {
    await page.goto("/login");
    await expect(page).toHaveURL(/\/auth\/sign-in/);

    await page.goto("/signup");
    await expect(page).toHaveURL(/\/auth\/sign-up/);
  });

  test("legacy /practice redirects to learner practice (then guarded to sign-in)", async ({ page }) => {
    // /practice -> /learner/practice -> (protected, no session) -> sign-in with next.
    await page.goto("/practice");
    await expect(page).toHaveURL(/\/auth\/sign-in\?next=%2Flearner%2Fpractice/);
  });
});
