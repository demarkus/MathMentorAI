"use server";

import { redirect } from "next/navigation";
import { requireRole } from "@/lib/auth/require-role";
import { createClient, createServiceRoleClient } from "@/lib/supabase/server";
import { gradePractice, explanationFor, PRACTICE_MAX_QUESTIONS, type PracticeQuestion } from "@/lib/math/practice";
import { isAnswerCorrect } from "@/lib/math/check-answer";
import { loadSession, startSession, finalizeSession, submittedMatchesIssued, isSessionExpired } from "@/lib/quiz/session";
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

async function learnerId(userId: string): Promise<string | undefined> {
  const supabase = await createClient();
  const { data } = await supabase.from("learner_profiles").select("id").eq("user_id", userId).maybeSingle();
  return (data as { id: string } | null)?.id;
}

/**
 * Explicitly issues a practice session for a topic + grade and redirects to the
 * run view. A mutation (invoked by an explicit click), never a GET render, so
 * navigating to or prefetching the topic page creates no row. topicId/slug/grade
 * are bound on the server from the already-resolved topic.
 */
export async function startPractice(
  topicId: string,
  topicSlug: string,
  grade: number,
): Promise<{ error?: string } | void> {
  const user = await requireRole("learner");
  const id = await learnerId(user.id);
  if (!id) redirect("/onboarding");

  const admin = createServiceRoleClient();
  if (!admin) return { error: "We couldn’t start this practice right now. Please try again." };

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("questions")
    .select("id")
    .eq("topic_id", topicId)
    .eq("is_active", true)
    .order("marks", { ascending: true })
    .limit(PRACTICE_MAX_QUESTIONS);
  if (error) return { error: "We couldn’t load the questions. Please try again." };

  const questionIds = ((data ?? []) as { id: string }[]).map((row) => row.id);
  if (questionIds.length === 0) {
    return { error: "There aren’t any active questions for this topic right now. Please check back soon." };
  }

  const sessionId = await startSession(admin, {
    learnerId: id,
    quizType: "practice",
    topicId,
    grade,
    questionIds,
  });
  if (!sessionId) return { error: "We couldn’t start this practice right now. Please try again." };

  redirect(`/learner/practice/${topicSlug}?grade=${grade}&session=${sessionId}`);
}

/**
 * Marks a topic practice run. `sessionId` and `topicSlug` are bound on the
 * server; the client supplies only the answers and an idempotency key. Answers
 * are accepted only for the issued session's question set, matching the topic
 * and grade, and every write goes through the trusted finalize function.
 */
export async function submitPractice(
  sessionId: string,
  topicSlug: string,
  answers: QuizAnswer[],
  submissionKey: string,
): Promise<{ error?: string } | void> {
  const user = await requireRole("learner");
  const id = await learnerId(user.id);
  if (!id) return { error: "We couldn’t find your learner profile. Please finish onboarding." };

  const admin = createServiceRoleClient();
  if (!admin) return { error: "We couldn’t mark your answers right now. Please try again." };

  const session = await loadSession(admin, String(sessionId ?? ""), id);
  if (!session || session.quizType !== "practice") return { error: "This practice session is no longer valid." };
  if (isSessionExpired(session)) return { error: "This practice has expired. Please start a new one." };

  const submittedIds = answers.map((entry) => entry.questionId);
  if (!submittedMatchesIssued(submittedIds, session.questionIds)) {
    return { error: "Your answers didn’t match this practice set. Please try again." };
  }

  // Only active questions belonging to the session's topic + grade are accepted.
  const { data, error } = await admin
    .from("questions")
    .select("id, grade, marks, difficulty, question_text, answer_text, hint, solution_steps, topic_id, topics(name, slug)")
    .in("id", session.questionIds)
    .eq("is_active", true)
    .eq("topic_id", session.topicId ?? "")
    .eq("grade", session.grade ?? 0);
  if (error) return { error: "We couldn’t load the questions to mark your answers. Please try again." };

  const questions = ((data ?? []) as unknown as QuestionRow[]).map(toPracticeQuestion);
  if (questions.length !== session.questionIds.length) {
    return { error: "Some questions are no longer available. Please retry this topic." };
  }

  const answersById = new Map(answers.map((entry) => [entry.questionId, entry.answer]));
  const summary = gradePractice(questions, answersById);

  const reportId = await finalizeSession(admin, {
    sessionId: session.id,
    learnerId: id,
    submissionKey: String(submissionKey ?? ""),
    score: summary.score,
    totalMarks: summary.totalMarks,
    percentage: summary.percentage,
    reportType: "practice",
    reportData: summary,
    attempts: summary.questions.map((q) => ({
      questionId: q.questionId,
      submitted: q.submitted,
      isCorrect: q.isCorrect,
      score: q.score,
    })),
  });
  if (!reportId) return { error: "We couldn’t save your results. Please try again." };

  redirect(`/learner/practice/${topicSlug}/result?report=${reportId}`);
}

/**
 * Trusted per-question check for practice reveal. Bound to the learner's issued
 * session: only questions that were issued for this session can be checked, so
 * answer keys cannot be enumerated. Reads the answer key via the service role
 * and scores server-side, returning the answer + explanation after the check.
 */
export async function checkPracticeAnswer(
  sessionId: string,
  questionId: string,
  submitted: string,
): Promise<QuizCheckResult | { error: string }> {
  const user = await requireRole("learner");
  const id = await learnerId(user.id);
  if (!id) return { error: "Answer checking is unavailable right now." };

  const admin = createServiceRoleClient();
  if (!admin) return { error: "Answer checking is unavailable right now." };

  const session = await loadSession(admin, String(sessionId ?? ""), id);
  if (!session || session.quizType !== "practice") return { error: "This practice session is no longer valid." };
  if (isSessionExpired(session)) return { error: "This practice has expired. Please start a new one." };
  if (!session.questionIds.includes(String(questionId ?? ""))) {
    return { error: "That question isn’t part of this practice set." };
  }

  const { data, error } = await admin
    .from("questions")
    .select("answer_text, hint, solution_steps")
    .eq("id", String(questionId))
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
