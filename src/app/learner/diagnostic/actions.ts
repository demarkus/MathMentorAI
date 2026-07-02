"use server";

import { redirect } from "next/navigation";
import { requireRole } from "@/lib/auth/require-role";
import { createClient } from "@/lib/supabase/server";
import { gradeDiagnostic, encodeSummary, type DiagnosticQuestion } from "@/lib/math/diagnostic";
import { createQuizSession, insertAttempts, createReport } from "@/lib/quiz/persistence";
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

export async function submitDiagnostic(answers: QuizAnswer[]): Promise<{ error?: string } | void> {
  const user = await requireRole("learner");
  const supabase = await createClient();

  const ids = answers.map((entry) => entry.questionId).filter(Boolean);
  if (ids.length === 0) return { error: "No answers were submitted." };

  const { data, error } = await supabase
    .from("questions")
    .select("id, grade, marks, difficulty, question_text, answer_text, topic_id, topics(name, slug)")
    .in("id", ids)
    .eq("is_active", true);

  if (error) return { error: "We couldn’t load the questions to mark your answers. Please try again." };

  const questions = ((data ?? []) as unknown as QuestionRow[]).map(toDiagnosticQuestion);
  if (questions.length === 0) return { error: "These questions are no longer available." };

  const answersById = new Map(answers.map((entry) => [entry.questionId, entry.answer]));
  const { summary, graded } = gradeDiagnostic(questions, answersById);

  const { data: learner } = await supabase
    .from("learner_profiles")
    .select("id")
    .eq("user_id", user.id)
    .maybeSingle();
  const learnerId = (learner as { id: string } | null)?.id;

  // Without a learner profile we cannot persist; show the stateless result.
  if (!learnerId) {
    redirect(`/learner/diagnostic/result?data=${encodeSummary(summary)}`);
  }

  const sessionId = await createQuizSession(learnerId, "diagnostic", summary);

  const attemptsError = await insertAttempts(supabase, learnerId, graded, sessionId);
  if (attemptsError) return { error: attemptsError };

  const reportId = await createReport(learnerId, sessionId, "diagnostic", summary);

  // Prefer the durable DB-backed result; fall back to the encoded summary.
  redirect(
    reportId
      ? `/learner/diagnostic/result?report=${reportId}`
      : `/learner/diagnostic/result?data=${encodeSummary(summary)}`,
  );
}
