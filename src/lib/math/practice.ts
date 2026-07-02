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

/** Runtime guard for a summary loaded from an untrusted source (URL or DB jsonb). */
export function isPracticeSummary(value: unknown): value is PracticeSummary {
  if (!value || typeof value !== "object") return false;
  const candidate = value as Record<string, unknown>;
  return (
    typeof candidate.percentage === "number" &&
    typeof candidate.topicName === "string" &&
    Array.isArray(candidate.questions)
  );
}

/** Compact, URL-safe transport of the summary (fallback when reports table is absent). */
export function encodePracticeSummary(summary: PracticeSummary): string {
  return Buffer.from(JSON.stringify(summary)).toString("base64url");
}

export function decodePracticeSummary(data: string): PracticeSummary | null {
  try {
    const parsed: unknown = JSON.parse(Buffer.from(data, "base64url").toString("utf8"));
    return isPracticeSummary(parsed) ? parsed : null;
  } catch {
    return null;
  }
}
