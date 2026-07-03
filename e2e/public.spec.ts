import { test, expect } from "@playwright/test";

// Marketing pages render without a backend, so these run against the app booted
// with placeholder Supabase env. They perform no writes (no form submission).
test.describe("public marketing", () => {
  test("landing page shows the hero and primary CTAs", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    await expect(page.getByRole("link", { name: /start beta access/i })).toHaveAttribute("href", "/beta");
    await expect(page.getByRole("link", { name: /see pricing/i })).toHaveAttribute("href", "/pricing");
  });

  test("pricing lists plans and deep-links to /beta with the chosen plan", async ({ page }) => {
    await page.goto("/pricing");
    await expect(page.getByRole("heading", { name: /simple beta pricing/i })).toBeVisible();
    await expect(page.getByRole("link", { name: /choose parent beta/i })).toHaveAttribute(
      "href",
      /\/beta\?plan=parent-beta/,
    );
  });

  test("beta page preselects the plan and requires name + email", async ({ page }) => {
    await page.goto("/beta?plan=parent-beta");
    // Exact match targets the intro sentence's plan name, not the longer
    // "Parent Beta — R199 …" <option> label in the plan dropdown.
    await expect(page.getByText("Parent Beta", { exact: true })).toBeVisible();
    // Native client-side validation (added in the hardening pass).
    await expect(page.locator('input[type="email"]')).toHaveJSProperty("required", true);
    await expect(page.locator('input[type="text"]').first()).toHaveJSProperty("required", true);
  });
});
