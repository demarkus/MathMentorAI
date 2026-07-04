import { test, expect } from "vitest";
import { safeNextPath, DEFAULT_SAFE_PATH } from "@/lib/auth/safe-redirect";

// Safe, application-local destinations are preserved verbatim.
test.each([
  ["/dashboard", "/dashboard"],
  ["/learner/diagnostic", "/learner/diagnostic"],
  ["/admin/questions?page=2", "/admin/questions?page=2"],
  ["/learner/practice/factorisation?grade=9", "/learner/practice/factorisation?grade=9"],
  ["/dashboard#section", "/dashboard#section"],
  ["/path/with@at-sign", "/path/with@at-sign"], // '@' in a plain path is not an authority
])("keeps safe local path %s", (input, expected) => {
  expect(safeNextPath(input)).toBe(expected);
});

// Malicious / malformed destinations fall back to the default.
test.each([
  "@evil.example", // user-info syntax, no leading slash
  "//evil.example", // protocol-relative
  "///evil.example",
  "/\\evil.example", // backslash-smuggled authority
  "\\\\evil.example",
  "https://evil.example", // absolute URL
  "http://evil.example/path",
  "HtTpS://evil.example", // scheme case-insensitive
  "mailto:attacker@evil.example",
  "javascript:alert(1)", // dangerous scheme
  "//user@evil.example", // authority + user-info
  "/\tnewline", // control character
  "/two words", // whitespace
  "not-a-path", // relative, no leading slash
  "", // empty
  "   ", // whitespace only
])("rejects unsafe destination %j", (input) => {
  expect(safeNextPath(input)).toBe(DEFAULT_SAFE_PATH);
});

test("non-string input falls back to the default", () => {
  expect(safeNextPath(null)).toBe(DEFAULT_SAFE_PATH);
  expect(safeNextPath(undefined)).toBe(DEFAULT_SAFE_PATH);
  expect(safeNextPath(42)).toBe(DEFAULT_SAFE_PATH);
  expect(safeNextPath({})).toBe(DEFAULT_SAFE_PATH);
});

test("a custom fallback is honoured", () => {
  expect(safeNextPath("//evil.example", "/learner")).toBe("/learner");
});

test("a leading/trailing-space wrapped safe path is trimmed and accepted", () => {
  expect(safeNextPath("  /dashboard  ")).toBe("/dashboard");
});
