import { test, expect, vi, beforeEach } from "vitest";

// redirect() normally throws NEXT_REDIRECT to halt execution; we throw a
// recognisable error so tests can assert the destination path.
vi.mock("next/navigation", () => ({
  redirect: (url: string) => {
    throw new Error("REDIRECT:" + url);
  },
}));

// getCurrentUser reads the session/profile via Supabase; stub it per-test.
vi.mock("@/lib/auth/get-current-user", () => ({
  getCurrentUser: vi.fn(),
}));

import { getCurrentUser } from "@/lib/auth/get-current-user";
import { requireUser, requireRole } from "@/lib/auth/require-role";

const mockedGetUser = vi.mocked(getCurrentUser);

function fakeUser(role: string | null) {
  return {
    id: "u1",
    email: "a@b.c",
    profile: role ? { id: "u1", email: "a@b.c", full_name: "A", role } : null,
  };
}

beforeEach(() => {
  mockedGetUser.mockReset();
});

test("requireUser: no session redirects to sign-in", async () => {
  mockedGetUser.mockResolvedValue(null);
  await expect(requireUser()).rejects.toThrow("REDIRECT:/auth/sign-in");
});

test("requireUser: returns the user when a session exists", async () => {
  mockedGetUser.mockResolvedValue(fakeUser("student") as never);
  await expect(requireUser()).resolves.toMatchObject({ id: "u1" });
});

test("requireRole: no session -> sign-in", async () => {
  mockedGetUser.mockResolvedValue(null);
  await expect(requireRole("learner")).rejects.toThrow("REDIRECT:/auth/sign-in");
});

test("requireRole: signed in without a role -> onboarding", async () => {
  mockedGetUser.mockResolvedValue(fakeUser(null) as never);
  await expect(requireRole("learner")).rejects.toThrow("REDIRECT:/onboarding");
});

test("requireRole: learner section maps to the stored 'student' role and passes", async () => {
  mockedGetUser.mockResolvedValue(fakeUser("student") as never);
  await expect(requireRole("learner")).resolves.toMatchObject({ profile: { role: "student" } });
});

test("requireRole: wrong role -> dashboard", async () => {
  mockedGetUser.mockResolvedValue(fakeUser("teacher") as never);
  await expect(requireRole("learner")).rejects.toThrow("REDIRECT:/dashboard");
});

test("requireRole: accepts any of an allowed list", async () => {
  mockedGetUser.mockResolvedValue(fakeUser("admin") as never);
  await expect(requireRole(["teacher", "admin"])).resolves.toMatchObject({ profile: { role: "admin" } });
});

test("requireRole: a role outside the allowed list is redirected", async () => {
  mockedGetUser.mockResolvedValue(fakeUser("parent") as never);
  await expect(requireRole(["teacher", "admin"])).rejects.toThrow("REDIRECT:/dashboard");
});
