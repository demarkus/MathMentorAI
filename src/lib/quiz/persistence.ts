import type { SupabaseClient } from "@supabase/supabase-js";
import { createServiceRoleClient } from "@/lib/supabase/server";

export type QuizType = "diagnostic" | "practice";
export type ReportType = "diagnostic" | "practice" | "progress";

export type GradedAttempt = {
  questionId: string;
  submitted: string;
  isCorrect: boolean;
  score: number;
};

const ATTEMPTS_ERROR = "We couldn’t save your answers. Please try again.";

/**
 * Creates a quiz_sessions row via the service-role client. Returns its id, or
 * null when the table is not present in the current schema (best-effort).
 */
export async function createQuizSession(
  learnerId: string,
  quizType: QuizType,
  totals: { score: number; totalMarks: number; percentage: number },
): Promise<string | null> {
  const admin = createServiceRoleClient();
  if (!admin) return null;
  const { data, error } = await admin
    .from("quiz_sessions")
    .insert({
      learner_id: learnerId,
      quiz_type: quizType,
      score: totals.score,
      total_marks: totals.totalMarks,
      percentage: totals.percentage,
    })
    .select("id")
    .single();
  if (error || !data) return null;
  return (data as { id: string }).id;
}

/**
 * Inserts attempts under the learner's own session (RLS-scoped). Links each row
 * to the quiz session when possible, retrying without the column if the
 * attempts.quiz_session_id migration has not been applied yet. Returns a
 * user-facing error message on genuine failure, otherwise null.
 */
export async function insertAttempts(
  supabase: SupabaseClient,
  learnerId: string,
  graded: GradedAttempt[],
  sessionId: string | null,
): Promise<string | null> {
  const baseRows = graded.map((entry) => ({
    learner_id: learnerId,
    question_id: entry.questionId,
    submitted_answer: entry.submitted,
    is_correct: entry.isCorrect,
    score: entry.score,
  }));

  if (sessionId) {
    const linkedRows = baseRows.map((row) => ({ ...row, quiz_session_id: sessionId }));
    const { error } = await supabase.from("attempts").insert(linkedRows);
    if (!error) return null;
    if (error.code !== "42703") return ATTEMPTS_ERROR;
    // quiz_session_id column not present yet — fall back to unlinked attempts.
  }

  const { error } = await supabase.from("attempts").insert(baseRows);
  return error ? ATTEMPTS_ERROR : null;
}

/**
 * Persists a report via the service-role client. Returns its id when the table
 * exists, otherwise null so the caller can fall back to an encoded summary.
 */
export async function createReport(
  learnerId: string,
  sessionId: string | null,
  reportType: ReportType,
  data: unknown,
): Promise<string | null> {
  const admin = createServiceRoleClient();
  if (!admin) return null;
  const { data: row, error } = await admin
    .from("reports")
    .insert({
      learner_id: learnerId,
      quiz_session_id: sessionId,
      report_type: reportType,
      data,
    })
    .select("id")
    .single();
  if (error || !row) return null;
  return (row as { id: string }).id;
}
