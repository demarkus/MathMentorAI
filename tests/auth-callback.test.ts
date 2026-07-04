import { test, expect, vi, beforeEach } from "vitest";

// Stub the Supabase server client so the route can run without a real session.
const exchangeCodeForSession = vi.fn();
vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(async () => ({ auth: { exchangeCodeForSession } })),
}));

import { GET } from "@/app/auth/callback/route";

const ORIGIN = "https://app.mathmentor.test";

function callbackRequest(params: Record<string, string>): Request {
  const url = new URL("/auth/callback", ORIGIN);
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
  return new Request(url.toString());
}

function location(res: Response): string {
  return res.headers.get("location") ?? "";
}

beforeEach(() => {
  exchangeCodeForSession.mockReset();
});

test("valid code with no next redirects to the default /dashboard on-origin", async () => {
  exchangeCodeForSession.mockResolvedValue({ error: null });
  const res = await GET(callbackRequest({ code: "abc" }));
  expect(location(res)).toBe(`${ORIGIN}/dashboard`);
});

test("valid code with a safe next preserves the local path on-origin", async () => {
  exchangeCodeForSession.mockResolvedValue({ error: null });
  const res = await GET(callbackRequest({ code: "abc", next: "/learner/progress" }));
  expect(location(res)).toBe(`${ORIGIN}/learner/progress`);
});

test.each([
  "//evil.example",
  "https://evil.example",
  "/\\evil.example",
  "@evil.example",
  "javascript:alert(1)",
])("valid code with malicious next %j stays on-origin at /dashboard", async (next) => {
  exchangeCodeForSession.mockResolvedValue({ error: null });
  const res = await GET(callbackRequest({ code: "abc", next }));
  const loc = new URL(location(res));
  expect(loc.origin).toBe(ORIGIN);
  expect(loc.pathname).toBe("/dashboard");
});

test("a failed code exchange redirects to sign-in on-origin, never off-site", async () => {
  exchangeCodeForSession.mockResolvedValue({ error: { message: "bad code" } });
  const res = await GET(callbackRequest({ code: "abc", next: "//evil.example" }));
  const loc = new URL(location(res));
  expect(loc.origin).toBe(ORIGIN);
  expect(loc.pathname).toBe("/auth/sign-in");
  expect(loc.searchParams.get("error")).toBe("bad code");
});

test("a missing code redirects to sign-in with an error", async () => {
  const res = await GET(callbackRequest({}));
  const loc = new URL(location(res));
  expect(loc.origin).toBe(ORIGIN);
  expect(loc.pathname).toBe("/auth/sign-in");
  expect(loc.searchParams.get("error")).toBe("Missing authentication code.");
  expect(exchangeCodeForSession).not.toHaveBeenCalled();
});
