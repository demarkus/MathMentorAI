import { isAnswerCorrect } from "./check-answer";

export const PRACTICE_MIN_QUESTIONS = 5;
export const PRACTICE_MAX_QUESTIONS = 10;

export type PracticeQuestion = {
  id: string;
  question_text: string;
  answer_text: string;
  hint: string;
  solution_steps: string[];
  difficulty: string;
  marks: number;
  grade: number;
  topic_id: string;
  topicName: string;
  topicSlug: string;
};

export type PracticeQuestionResult = {
  questionId: string;
  questionText: string;
  submitted: string;
  isCorrect: boolean;
  correctAnswer: string;
  explanation: string[];
  marks: number;
  score: number;
};

export type PracticeSummary = {
  topicName: string;
  topicSlug: string;
  grade: number;
  score: number;
  totalMarks: number;
  correct: number;
  totalQuestions: number;
  percentage: number;
  questions: PracticeQuestionResult[];
};

/** The explanation shown for a question: solution steps, or the hint as a fallback. */
export function explanationFor(question: { solution_steps?: string[]; hint?: string }): string[] {
  if (question.solution_steps && question.solution_steps.length > 0) return question.solution_steps;
  return question.hint ? [question.hint] : [];
}

/** Caps the question set for a practice run (questions are already topic-filtered). */
export function selectPracticeQuestions(
  all: PracticeQuestion[],
  max = PRACTICE_MAX_QUESTIONS,
): PracticeQuestion[] {
  return all.slice(0, max);
}

/** Marks the submitted answers and builds a per-question practice summary. */
export function gradePractice(
  questions: PracticeQuestion[],
  answersById: Map<string, string>,
): PracticeSummary {
  const results: PracticeQuestionResult[] = [];
  let score = 0;
  let totalMarks = 0;
  let correct = 0;

  for (const question of questions) {
    const submitted = answersById.get(question.id) ?? "";
    const ok = isAnswerCorrect(submitted, question.answer_text);
    totalMarks += question.marks;
    if (ok) {
      score += question.marks;
      correct += 1;
    }
    results.push({
      questionId: question.id,
      questionText: question.question_text,
      submitted,
      isCorrect: ok,
      correctAnswer: question.answer_text,
      explanation: explanationFor(question),
      marks: question.marks,
      score: ok ? question.marks : 0,
    });
  }

  const topic = questions[0];
  return {
    topicName: topic?.topicName ?? "Practice",
    topicSlug: topic?.topicSlug ?? "",
    grade: topic?.grade ?? 0,
    score,
    totalMarks,
    correct,
    totalQuestions: questions.length,
    percentage: totalMarks ? Math.round((score / totalMarks) * 100) : 0,
    questions: results,
  };
}

/**
 * A short, plain-language next step for a practice run. Transparent rules:
 * strong scores move on; mid scores review specific mistakes; low scores slow
 * down and lean on the hints and worked steps before retrying.
 */
export function buildPracticeRecommendation(summary: PracticeSummary): string {
  if (summary.totalQuestions === 0) return "Run a practice set to get a personalised next step.";
  const missed = summary.questions.filter((question) => !question.isCorrect).length;

  if (summary.percentage >= 80) {
    return "Strong work on this topic — try a harder topic or run a mixed set to keep improving.";
  }
  if (summary.percentage < 40) {
    return "Take it step by step: read the worked solutions and hints below, then retry this topic when you're ready.";
  }
  if (missed > 0) {
    return `You're getting there. Review the ${missed} question${missed === 1 ? "" : "s"} marked "Review" below, then retry this topic.`;
  }
  return "Nice progress — retry this topic to lock it in, or move on to a new one.";
}

/** Runtime guard for a summary loaded from the persisted report jsonb. */
export function isPracticeSummary(value: unknown): value is PracticeSummary {
  if (!value || typeof value !== "object") return false;
  const candidate = value as Record<string, unknown>;
  return (
    typeof candidate.percentage === "number" &&
    typeof candidate.topicName === "string" &&
    Array.isArray(candidate.questions)
  );
}
