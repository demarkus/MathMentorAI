import { test, expect, type Page } from "@playwright/test";
import { hasE2eSupabase, provisionUser, deleteUser } from "./support/supabase";

/**
 * Authenticated journeys. Gated: these need a dedicated test Supabase project
 * (E2E_SUPABASE_*) and skip otherwise. The app server (started by
 * playwright.config.ts) must point at that same project.
 */
test.describe("auth journeys", () => {
  test.beforeEach(() => {
    test.skip(!hasE2eSupabase, "requires E2E_SUPABASE_* (a dedicated test project)");
  });

  async function signIn(page: Page, email: string, password: string) {
    await page.goto("/auth/sign-in");
    await page.getByLabel(/email/i).fill(email);
    await page.getByLabel(/password/i).fill(password);
    await page.getByRole("button", { name: /log in/i }).click();
  }

  test("a learner signs in and lands on the learner dashboard", async ({ page }) => {
    const user = await provisionUser({ role: "student", grade: 9 });
    try {
      await signIn(page, user.email, user.password);
      await expect(page).toHaveURL(/\/learner(\/|$)/); // /dashboard -> /learner
    } finally {
      await deleteUser(user.id);
    }
  });

  test("a new user completes onboarding and is routed into the diagnostic", async ({ page }) => {
    const user = await provisionUser({ role: null });
    try {
      await signIn(page, user.email, user.password);
      await expect(page).toHaveURL(/\/onboarding/); // no role yet
      // Learner is preselected; grade defaults to 9. Submit onboarding.
      await page.getByRole("button", { name: /^continue$/i }).click();
      await expect(page).toHaveURL(/\/learner\/diagnostic/); // onboarding guidance
    } finally {
      await deleteUser(user.id);
    }
  });

  test("wrong-role access is redirected to the learner's own area", async ({ page }) => {
    const user = await provisionUser({ role: "student", grade: 10 });
    try {
      await signIn(page, user.email, user.password);
      await expect(page).toHaveURL(/\/learner(\/|$)/);
      await page.goto("/admin");
      await expect(page).toHaveURL(/\/learner(\/|$)/); // requireRole('admin') -> /dashboard -> /learner
    } finally {
      await deleteUser(user.id);
    }
  });

  test("sign out clears the session", async ({ page }) => {
    const user = await provisionUser({ role: "student", grade: 9 });
    try {
      await signIn(page, user.email, user.password);
      await expect(page).toHaveURL(/\/learner(\/|$)/);

      await page.goto("/auth/sign-out");
      await expect(page).toHaveURL(/\/auth\/sign-in/);

      await page.goto("/learner");
      await expect(page).toHaveURL(/\/auth\/sign-in/); // no session -> guarded
    } finally {
      await deleteUser(user.id);
    }
  });
});
