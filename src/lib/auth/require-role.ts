import { redirect } from "next/navigation";
import { getCurrentUser, type CurrentUser } from "./get-current-user";
import type { Role } from "@/lib/types";

/**
 * The learner-facing sections of the app use the label "learner", but the
 * database `user_role` enum stores that role as "student". Callers protect a
 * section with the app-facing role name; this maps it to the stored value.
 */
export type SectionRole = "learner" | "parent" | "teacher" | "admin";

const SECTION_TO_DB_ROLE: Record<SectionRole, Role> = {
  learner: "student",
  parent: "parent",
  teacher: "teacher",
  admin: "admin",
};

/** Ensures a session exists, redirecting to sign-in otherwise. */
export async function requireUser(): Promise<CurrentUser> {
  const user = await getCurrentUser();
  if (!user) redirect("/auth/sign-in");
  return user;
}

/**
 * Ensures the signed-in user holds one of the allowed section roles.
 * - No session → /auth/sign-in
 * - Signed in but no role/profile → /onboarding
 * - Signed in with the wrong role → /dashboard (which re-routes to their area)
 */
export async function requireRole(allowed: SectionRole | SectionRole[]): Promise<CurrentUser> {
  const user = await requireUser();
  const role = user.profile?.role;
  if (!role) redirect("/onboarding");

  const sections = Array.isArray(allowed) ? allowed : [allowed];
  const dbRoles = sections.map((section) => SECTION_TO_DB_ROLE[section]);
  if (!dbRoles.includes(role)) redirect("/dashboard");

  return user;
}
