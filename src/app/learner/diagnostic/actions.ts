"use server";

import { redirect } from "next/navigation";
import { requireRole } from "@/lib/auth/require-role";
import { createClient, createServiceRoleClient } from "@/lib/supabase/server";
import { gradeDiagnostic, type DiagnosticQuestion } from "@/lib/math/diagnostic";
import { loadSession, finalizeSession, submittedMatchesIssued } from "@/lib/quiz/session";
import type { QuizAnswer } from "@/components/quiz/QuizShell";

type QuestionRow = {
  id: string;
  grade: number;
  marks: number;
  difficulty: string;
  question_text: string;
  answer_text: string;
  topic_id: string;
  topics: { name: string; slug: string } | { name: string; slug: string }[] | null;
};

function toDiagnosticQuestion(row: QuestionRow): DiagnosticQuestion {
  const topic = Array.isArray(row.topics) ? row.topics[0] : row.topics;
  return {
    id: row.id,
    question_text: row.question_text,
    answer_text: row.answer_text,
    difficulty: row.difficulty,
    marks: row.marks,
    grade: row.grade,
    topic_id: row.topic_id,
    topicName: topic?.name ?? "Algebra",
    topicSlug: topic?.slug ?? "",
  };
}

/**
 * Marks a diagnostic. `sessionId` is bound on the server; the client supplies
 * only the answers and an idempotency key. Scoring reads the answer keys via the
 * service role, and every write goes through the trusted finalize function.
 */
export async function submitDiagnostic(
  sessionId: string,
  answers: QuizAnswer[],
  submissionKey: string,
): Promise<{ error?: string } | void> {
  const user = await requireRole("learner");
  const supabase = await createClient();

  const { data: learner } = await supabase
    .from("learner_profiles")
    .select("id")
    .eq("user_id", user.id)
    .maybeSingle();
  const learnerId = (learner as { id: string } | null)?.id;
  if (!learnerId) return { error: "We couldn’t find your learner profile. Please finish onboarding." };

  const admin = createServiceRoleClient();
  if (!admin) return { error: "We couldn’t mark your answers right now. Please try again." };

  const session = await loadSession(admin, String(sessionId ?? ""), learnerId);
  if (!session || session.quizType !== "diagnostic") return { error: "This diagnostic session is no longer valid." };

  const submittedIds = answers.map((entry) => entry.questionId);
  if (!submittedMatchesIssued(submittedIds, session.questionIds)) {
    return { error: "Your answers didn’t match this diagnostic. Please retake it." };
  }

  // Fetch the issued questions (with answer keys) and reject any that are no
  // longer active.
  const { data, error } = await admin
    .from("questions")
    .select("id, grade, marks, difficulty, question_text, answer_text, topic_id, topics(name, slug)")
    .in("id", session.questionIds)
    .eq("is_active", true);
  if (error) return { error: "We couldn’t load the questions to mark your answers. Please try again." };

  const questions = ((data ?? []) as unknown as QuestionRow[]).map(toDiagnosticQuestion);
  if (questions.length !== session.questionIds.length) {
    return { error: "Some questions are no longer available. Please retake the diagnostic." };
  }

  const answersById = new Map(answers.map((entry) => [entry.questionId, entry.answer]));
  const { summary, graded } = gradeDiagnostic(questions, answersById);

  const reportId = await finalizeSession(admin, {
    sessionId: session.id,
    learnerId,
    submissionKey: String(submissionKey ?? ""),
    score: summary.score,
    totalMarks: summary.totalMarks,
    percentage: summary.percentage,
    reportType: "diagnostic",
    reportData: summary,
    attempts: graded,
  });
  if (!reportId) return { error: "We couldn’t save your results. Please try again." };

  redirect(`/learner/diagnostic/result?report=${reportId}`);
}
