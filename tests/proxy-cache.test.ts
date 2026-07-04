import { test, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// Control the authenticated state per test.
let claims: unknown = null;
vi.mock("@supabase/ssr", () => ({
  createServerClient: vi.fn(() => ({
    auth: { getClaims: async () => ({ data: { claims } }) },
  })),
}));

import { updateSession } from "@/lib/supabase/proxy";

function req(path: string): NextRequest {
  return new NextRequest(new URL(path, "http://localhost"));
}

beforeEach(() => {
  claims = null;
  process.env.NEXT_PUBLIC_SUPABASE_URL = "http://localhost:54321";
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "anon-test-key";
});

test("an authenticated protected route gets a private, no-store Cache-Control", async () => {
  claims = { sub: "u1" };
  const res = await updateSession(req("/learner/progress"));
  const cc = res.headers.get("cache-control") ?? "";
  expect(cc).toContain("private");
  expect(cc).toContain("no-store");
});

test("a public route is not forced no-store by the proxy", async () => {
  claims = null;
  const res = await updateSession(req("/pricing"));
  const cc = res.headers.get("cache-control") ?? "";
  expect(cc).not.toContain("no-store");
});

test("an unauthenticated protected route redirects to sign-in with next", async () => {
  claims = null;
  const res = await updateSession(req("/admin/questions"));
  expect(res.status).toBe(307); // NextResponse.redirect
  const loc = res.headers.get("location") ?? "";
  expect(loc).toContain("/auth/sign-in");
  expect(loc).toContain("next=%2Fadmin%2Fquestions");
});
