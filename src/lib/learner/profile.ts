import type { SupabaseClient } from "@supabase/supabase-js";

/** The two grades the MVP supports (CAPS Grade 9 & 10 algebra). */
export const VALID_GRADES = [9, 10] as const;
export type Grade = (typeof VALID_GRADES)[number];

/** Default grade used only when a learner has no valid grade recorded yet. */
export const DEFAULT_GRADE: Grade = 9;

export function isValidGrade(value: unknown): value is Grade {
  return value === 9 || value === 10;
}

/**
 * Coerces an untrusted grade (query param, cookie, etc.) to a supported grade,
 * or `undefined` when it isn't one. Never throws.
 */
export function parseGrade(value: unknown): Grade | undefined {
  const n = typeof value === "string" ? Number(value) : value;
  return isValidGrade(n) ? n : undefined;
}

export type LearnerContext = { id: string; grade: Grade };

/**
 * Loads a learner's `learner_profiles` id and grade for a user, or null when the
 * learner has no profile (caller should send them to onboarding). The grade is
 * normalised to a supported value, defaulting to {@link DEFAULT_GRADE} only if the
 * stored grade is missing/invalid.
 */
export async function loadLearnerContext(
  supabase: SupabaseClient,
  userId: string,
): Promise<LearnerContext | null> {
  const { data } = await supabase
    .from("learner_profiles")
    .select("id, grade")
    .eq("user_id", userId)
    .maybeSingle();
  const row = data as { id: string; grade: number | null } | null;
  if (!row) return null;
  return { id: row.id, grade: isValidGrade(row.grade) ? row.grade : DEFAULT_GRADE };
}
