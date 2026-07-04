import { test, expect } from "vitest";
import { safeNextPath, DEFAULT_SAFE_PATH } from "@/lib/auth/safe-redirect";

/**
 * The sign-in return-path contract. The login server action carries `next`
 * through the form and resolves the post-login destination with
 * `safeNextPath(next)` — a valid local path is honoured, anything else (or
 * absent) falls back to /dashboard. These assert that exact behaviour for the
 * values the sign-in form can receive.
 */

test("the default fallback is the dashboard", () => {
  expect(DEFAULT_SAFE_PATH).toBe("/dashboard");
});

// Valid local destinations a learner could be sent back to, incl. query params.
test.each([
  ["/learner", "/learner"],
  ["/learner/practice", "/learner/practice"],
  ["/learner/practice/factorisation?grade=10", "/learner/practice/factorisation?grade=10"],
  ["/admin/questions?page=3", "/admin/questions?page=3"],
  ["/teacher/resources", "/teacher/resources"],
])("returns to the valid local destination %s", (next, expected) => {
  expect(safeNextPath(next)).toBe(expected);
});

// Malicious / smuggled values must never leave the app — they collapse to /dashboard.
test.each([
  "https://evil.example",
  "http://evil.example/learner",
  "//evil.example",
  "/\\evil.example", // backslash-smuggled authority
  "\\\\evil.example",
  "//user@evil.example",
  "javascript:alert(1)",
  "mailto:attacker@evil.example",
  "/ /space", // whitespace-smuggled
  "not-a-path",
  "",
])("rejects a malicious next %j and falls back to /dashboard", (next) => {
  expect(safeNextPath(next)).toBe("/dashboard");
});

test("a missing next falls back to /dashboard", () => {
  expect(safeNextPath(undefined)).toBe("/dashboard");
  expect(safeNextPath(null)).toBe("/dashboard");
});
