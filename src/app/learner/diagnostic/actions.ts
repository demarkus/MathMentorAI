"use server";

import { redirect } from "next/navigation";
import { requireRole } from "@/lib/auth/require-role";
import { createClient, createServiceRoleClient } from "@/lib/supabase/server";
import { gradeDiagnostic, selectDiagnosticQuestions, type DiagnosticQuestion } from "@/lib/math/diagnostic";
import { generateAiHint } from "@/lib/ai/generate-hint";
import { loadLearnerContext } from "@/lib/learner/profile";
import { answersWithinLimit } from "@/lib/quiz/limits";
import { loadSession, startSession, finalizeSession, submittedMatchesIssued, isSessionExpired } from "@/lib/quiz/session";
import type { QuizAnswer } from "@/components/quiz/QuizShell";

type QuestionRow = {
  id: string;
  grade: number;
  marks: number;
  difficulty: string;
  question_text: string;
  answer_text: string;
  hint?: string | null;
  solution_steps?: string[] | null;
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
    hint: row.hint ?? undefined,
    solution_steps: Array.isArray(row.solution_steps) ? row.solution_steps : undefined,
  };
}

/**
 * Explicitly issues a diagnostic session for the signed-in learner and redirects
 * to the run view. This is a mutation (invoked by an explicit click), never a GET
 * render, so navigating to or prefetching /learner/diagnostic creates no row.
 */
export async function startDiagnostic(): Promise<{ error?: string } | void> {
  const user = await requireRole("learner");
  const supabase = await createClient();

  const learner = await loadLearnerContext(supabase, user.id);
  if (!learner) redirect("/onboarding");
  const { id: learnerId, grade } = learner;

  const admin = createServiceRoleClient();
  if (!admin) return { error: "We couldn’t start your diagnostic right now. Please try again." };

  // Render columns only — answer keys stay server-side and are read at grading.
  // Grade-scoped: a learner is only ever tested on their own grade.
  const { data, error } = await supabase
    .from("questions")
    .select("id, grade, marks, difficulty, question_text, topic_id, topics(name, slug)")
    .eq("is_active", true)
    .eq("grade", grade);
  if (error) return { error: "We couldn’t load the diagnostic. Please try again." };

  const all: DiagnosticQuestion[] = ((data ?? []) as unknown as QuestionRow[]).map((row) => {
    const topic = Array.isArray(row.topics) ? row.topics[0] : row.topics;
    return {
      id: row.id,
      question_text: row.question_text,
      answer_text: "",
      difficulty: row.difficulty,
      marks: row.marks,
      grade: row.grade,
      topic_id: row.topic_id,
      topicName: topic?.name ?? "Algebra",
      topicSlug: topic?.slug ?? "",
    };
  });

  const selected = selectDiagnosticQuestions(all, undefined, grade);
  if (selected.length === 0) {
    return { error: "There aren’t any active questions to build a diagnostic right now. Please check back soon." };
  }

  const sessionId = await startSession(admin, {
    learnerId,
    quizType: "diagnostic",
    grade,
    questionIds: selected.map((question) => question.id),
  });
  if (!sessionId) return { error: "We couldn’t start your diagnostic right now. Please try again." };

  redirect(`/learner/diagnostic?session=${sessionId}`);
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
  if (isSessionExpired(session)) return { error: "This diagnostic has expired. Please start a new one." };

  // Reject oversized answers before any grading or persistence.
  if (!answersWithinLimit(answers)) {
    return { error: "One of your answers is too long. Please shorten it and try again." };
  }

  const submittedIds = answers.map((entry) => entry.questionId);
  if (!submittedMatchesIssued(submittedIds, session.questionIds)) {
    return { error: "Your answers didn’t match this diagnostic. Please retake it." };
  }

  // Fetch the issued questions (with answer keys, hints, and worked steps for
  // the persisted review) and reject any that are no longer active.
  const { data, error } = await admin
    .from("questions")
    .select("id, grade, marks, difficulty, question_text, answer_text, hint, solution_steps, topic_id, topics(name, slug)")
    .in("id", session.questionIds)
    .eq("is_active", true);
  if (error) return { error: "We couldn’t load the questions to mark your answers. Please try again." };

  const questions = ((data ?? []) as unknown as QuestionRow[]).map(toDiagnosticQuestion);
  if (questions.length !== session.questionIds.length) {
    return { error: "Some questions are no longer available. Please retake the diagnostic." };
  }

  const answersById = new Map(answers.map((entry) => [entry.questionId, entry.answer]));
  const { summary, graded } = gradeDiagnostic(questions, answersById, session.grade ?? undefined);

  // Mistake-specific AI hints for the persisted review (feature-flagged by
  // ANTHROPIC_API_KEY; generateAiHint sends no learner identity and returns
  // null on any failure). Generated once here, in parallel, then stored with
  // the report — result-page views never call the API. Marking is already done.
  const wrongItems = (summary.review ?? []).filter((item) => !item.isCorrect && item.submitted.trim().length > 0);
  const aiHints = await Promise.all(
    wrongItems.map((item) =>
      generateAiHint({
        questionText: item.questionText,
        expectedAnswer: item.correctAnswer,
        learnerAnswer: item.submitted,
      }),
    ),
  );
  wrongItems.forEach((item, index) => {
    const aiHint = aiHints[index];
    if (aiHint) item.aiHint = aiHint;
  });

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
