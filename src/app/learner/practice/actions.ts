"use server";

import { redirect } from "next/navigation";
import { requireRole } from "@/lib/auth/require-role";
import { createClient, createServiceRoleClient } from "@/lib/supabase/server";
import { gradePractice, explanationFor, encodePracticeSummary, type PracticeQuestion } from "@/lib/math/practice";
import { isAnswerCorrect } from "@/lib/math/check-answer";
import { createQuizSession, insertAttempts, createReport } from "@/lib/quiz/persistence";
import type { QuizAnswer, QuizCheckResult } from "@/components/quiz/QuizShell";

type QuestionRow = {
  id: string;
  grade: number;
  marks: number;
  difficulty: string;
  question_text: string;
  answer_text: string;
  hint: string;
  solution_steps: string[] | null;
  topic_id: string;
  topics: { name: string; slug: string } | { name: string; slug: string }[] | null;
};

function toPracticeQuestion(row: QuestionRow): PracticeQuestion {
  const topic = Array.isArray(row.topics) ? row.topics[0] : row.topics;
  return {
    id: row.id,
    question_text: row.question_text,
    answer_text: row.answer_text,
    hint: row.hint,
    solution_steps: Array.isArray(row.solution_steps) ? row.solution_steps : [],
    difficulty: row.difficulty,
    marks: row.marks,
    grade: row.grade,
    topic_id: row.topic_id,
    topicName: topic?.name ?? "Practice",
    topicSlug: topic?.slug ?? "",
  };
}

/**
 * Marks a topic practice run and persists it. `topicSlug` and `grade` are bound
 * on the server (via .bind) so the client only supplies the answers.
 */
export async function submitPractice(
  topicSlug: string,
  grade: number,
  answers: QuizAnswer[],
): Promise<{ error?: string } | void> {
  const user = await requireRole("learner");
  const supabase = await createClient();

  const ids = answers.map((entry) => entry.questionId).filter(Boolean);
  if (ids.length === 0) return { error: "No answers were submitted." };

  // Answer keys are not readable through the Data API — read them via the trusted
  // service-role client to mark the answers server-side.
  const admin = createServiceRoleClient();
  if (!admin) return { error: "We couldn’t mark your answers right now. Please try again." };

  const { data, error } = await admin
    .from("questions")
    .select("id, grade, marks, difficulty, question_text, answer_text, hint, solution_steps, topic_id, topics(name, slug)")
    .in("id", ids)
    .eq("is_active", true);

  if (error) return { error: "We couldn’t load the questions to mark your answers. Please try again." };

  const questions = ((data ?? []) as unknown as QuestionRow[]).map(toPracticeQuestion);
  if (questions.length === 0) return { error: "These questions are no longer available." };

  const answersById = new Map(answers.map((entry) => [entry.questionId, entry.answer]));
  const summary = gradePractice(questions, answersById);

  const resultBase = `/learner/practice/${topicSlug}/result`;

  const { data: learner } = await supabase
    .from("learner_profiles")
    .select("id")
    .eq("user_id", user.id)
    .maybeSingle();
  const learnerId = (learner as { id: string } | null)?.id;

  // Without a learner profile we cannot persist; show the stateless result.
  if (!learnerId) {
    redirect(`${resultBase}?data=${encodePracticeSummary(summary)}`);
  }

  const sessionId = await createQuizSession(learnerId, "practice", summary);

  const graded = summary.questions.map((entry) => ({
    questionId: entry.questionId,
    submitted: entry.submitted,
    isCorrect: entry.isCorrect,
    score: entry.score,
  }));
  const attemptsError = await insertAttempts(supabase, learnerId, graded, sessionId);
  if (attemptsError) return { error: attemptsError };

  const reportId = await createReport(learnerId, sessionId, "practice", summary);

  redirect(reportId ? `${resultBase}?report=${reportId}` : `${resultBase}?data=${encodePracticeSummary(summary)}`);
}

/**
 * Trusted per-question check for practice reveal. Reads the answer key via the
 * service role (not exposed to the browser) and scores server-side, returning
 * the correct answer + explanation only after the check.
 *
 * NOTE: this reveals one question's answer at a time to an authenticated
 * learner. Binding the reveal strictly to the learner's issued practice session
 * (so answers cannot be enumerated) is completed in Part D.
 */
export async function checkPracticeAnswer(
  questionId: string,
  submitted: string,
): Promise<QuizCheckResult | { error: string }> {
  await requireRole("learner");
  const admin = createServiceRoleClient();
  if (!admin) return { error: "Answer checking is unavailable right now." };

  const { data, error } = await admin
    .from("questions")
    .select("answer_text, hint, solution_steps")
    .eq("id", String(questionId ?? ""))
    .eq("is_active", true)
    .maybeSingle();
  if (error || !data) return { error: "We couldn’t check that answer." };

  const row = data as { answer_text: string; hint: string | null; solution_steps: string[] | null };
  const steps = Array.isArray(row.solution_steps) ? row.solution_steps : [];
  return {
    isCorrect: isAnswerCorrect(String(submitted ?? ""), row.answer_text),
    correctAnswer: row.answer_text,
    hint: row.hint ?? "",
    explanation: explanationFor({ solution_steps: steps, hint: row.hint ?? undefined }),
  };
}
