import { isAnswerCorrect } from "./check-answer";

export const DIAGNOSTIC_QUESTION_LIMIT = 10;

export type DiagnosticQuestion = {
  id: string;
  question_text: string;
  answer_text: string;
  difficulty: string;
  marks: number;
  grade: number;
  topic_id: string;
  topicName: string;
  topicSlug: string;
  // Present only on the grading path (fetched with the answer keys after
  // submission); the pre-submission selection path never loads these.
  hint?: string;
  solution_steps?: string[];
};

export type TopicBreakdown = {
  topic: string;
  slug: string;
  correct: number;
  total: number;
  percentage: number;
};

/**
 * Per-question feedback embedded in the PERSISTED report only. It contains the
 * correct answer, hint, and worked steps, so it must never be built before
 * submission — gradeDiagnostic is only called on the trusted grading path.
 */
export type DiagnosticReviewItem = {
  questionId: string;
  questionText: string;
  submitted: string;
  isCorrect: boolean;
  correctAnswer: string;
  hint?: string;
  // Mistake-specific AI hint, generated once at grading time (never at render)
  // and persisted with the report. Absent when the feature is off or failed.
  aiHint?: string;
  explanation: string[];
};

export type DiagnosticSummary = {
  score: number; // marks earned
  totalMarks: number;
  correct: number; // questions correct
  totalQuestions: number;
  percentage: number;
  weakTopics: string[];
  strongTopics: string[];
  topics: TopicBreakdown[];
  // The grade this diagnostic covered. Optional so previously-persisted reports
  // (written before diagnostics became grade-scoped) still validate and render.
  grade?: number;
  // Question-by-question review. Optional so previously-persisted reports
  // (written before the review existed) still validate and render.
  review?: DiagnosticReviewItem[];
};

export type GradedQuestion = {
  questionId: string;
  submitted: string;
  isCorrect: boolean;
  score: number;
};

export type DiagnosticResult = {
  summary: DiagnosticSummary;
  graded: GradedQuestion[];
};

/** Round-robin across topics so no single topic dominates the selection. */
function roundRobinByTopic(questions: DiagnosticQuestion[]): DiagnosticQuestion[] {
  const byTopic = new Map<string, DiagnosticQuestion[]>();
  for (const question of questions) {
    const bucket = byTopic.get(question.topic_id) ?? [];
    bucket.push(question);
    byTopic.set(question.topic_id, bucket);
  }
  const buckets = [...byTopic.values()];
  const ordered: DiagnosticQuestion[] = [];
  let added = true;
  while (added) {
    added = false;
    for (const bucket of buckets) {
      const next = bucket.shift();
      if (next) {
        ordered.push(next);
        added = true;
      }
    }
  }
  return ordered;
}

/**
 * Picks a balanced diagnostic for a SINGLE grade: round-robined across the
 * grade's topics so no one topic dominates, capped at `limit`. Diagnostics are
 * grade-scoped — a learner is only ever tested on their own grade — so when
 * `grade` is given the pool is filtered to it first; questions from any other
 * grade are ignored (never silently mixed in).
 */
export function selectDiagnosticQuestions(
  all: DiagnosticQuestion[],
  limit = DIAGNOSTIC_QUESTION_LIMIT,
  grade?: number,
): DiagnosticQuestion[] {
  const pool = grade === undefined ? all : all.filter((question) => question.grade === grade);
  return roundRobinByTopic(pool).slice(0, limit);
}

/**
 * Marks the submitted answers and builds the per-topic diagnostic summary.
 * `grade` (when known) is stamped on the summary so the persisted report is
 * unambiguous even when topic names/slugs are shared across grades.
 */
export function gradeDiagnostic(
  questions: DiagnosticQuestion[],
  answersById: Map<string, string>,
  grade?: number,
): DiagnosticResult {
  const topics = new Map<string, TopicBreakdown>();
  const graded: GradedQuestion[] = [];
  const review: DiagnosticReviewItem[] = [];
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
    graded.push({ questionId: question.id, submitted, isCorrect: ok, score: ok ? question.marks : 0 });
    review.push({
      questionId: question.id,
      questionText: question.question_text,
      submitted,
      isCorrect: ok,
      correctAnswer: question.answer_text,
      ...(question.hint ? { hint: question.hint } : {}),
      explanation: question.solution_steps ?? [],
    });

    const breakdown = topics.get(question.topic_id) ?? {
      topic: question.topicName,
      slug: question.topicSlug,
      correct: 0,
      total: 0,
      percentage: 0,
    };
    breakdown.total += 1;
    if (ok) breakdown.correct += 1;
    topics.set(question.topic_id, breakdown);
  }

  const topicList = [...topics.values()].map((topic) => ({
    ...topic,
    percentage: topic.total ? Math.round((topic.correct / topic.total) * 100) : 0,
  }));

  const summary: DiagnosticSummary = {
    score,
    totalMarks,
    correct,
    totalQuestions: questions.length,
    percentage: totalMarks ? Math.round((score / totalMarks) * 100) : 0,
    weakTopics: topicList.filter((topic) => topic.percentage < 50).map((topic) => topic.topic),
    strongTopics: topicList.filter((topic) => topic.percentage >= 80).map((topic) => topic.topic),
    topics: topicList,
    grade,
    review,
  };

  return { summary, graded };
}

/** The weakest attempted topic (lowest accuracy), or null when none exist. */
export function weakestTopic(summary: DiagnosticSummary): TopicBreakdown | null {
  const attempted = summary.topics.filter((topic) => topic.total > 0);
  if (attempted.length === 0) return null;
  return [...attempted].sort((a, b) => a.percentage - b.percentage)[0];
}

/**
 * A short, plain-language next step derived from the summary. Simple and
 * transparent: weakest topic first; then band-based guidance for strong or
 * low scores; otherwise steady mixed practice.
 */
export function buildRecommendation(summary: DiagnosticSummary): string {
  if (summary.totalQuestions === 0) return "Take the diagnostic to get personalised recommendations.";

  const weakest = weakestTopic(summary);
  if (summary.weakTopics.length > 0 && weakest) {
    return `Start with focused practice on ${weakest.topic}, your weakest area right now. Use the hints and worked steps, then retake the diagnostic to measure your progress.`;
  }
  if (summary.percentage >= 80) {
    return "Excellent work — keep your momentum with harder, mixed practice across topics.";
  }
  if (summary.percentage < 40) {
    return "Take it one step at a time: work through the hints and worked solutions for each topic, then retry to build confidence.";
  }
  return "Keep practising across topics to strengthen your overall readiness.";
}

/** Runtime guard for a summary loaded from the persisted report jsonb. */
export function isDiagnosticSummary(value: unknown): value is DiagnosticSummary {
  if (!value || typeof value !== "object") return false;
  const candidate = value as Record<string, unknown>;
  return (
    typeof candidate.percentage === "number" &&
    Array.isArray(candidate.topics) &&
    // Older reports have no review; when present it must be an array.
    (candidate.review === undefined || Array.isArray(candidate.review))
  );
}

/** Runtime guard for one review item from the persisted report jsonb. */
export function isDiagnosticReviewItem(value: unknown): value is DiagnosticReviewItem {
  if (!value || typeof value !== "object") return false;
  const candidate = value as Record<string, unknown>;
  return (
    typeof candidate.questionId === "string" &&
    typeof candidate.questionText === "string" &&
    typeof candidate.submitted === "string" &&
    typeof candidate.isCorrect === "boolean" &&
    typeof candidate.correctAnswer === "string" &&
    Array.isArray(candidate.explanation)
  );
}
