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
};

export type TopicBreakdown = {
  topic: string;
  slug: string;
  correct: number;
  total: number;
  percentage: number;
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
 * Picks a balanced set of questions: alternating between Grade 9 and Grade 10,
 * round-robined across topics within each grade, capped at `limit`.
 */
export function selectDiagnosticQuestions(
  all: DiagnosticQuestion[],
  limit = DIAGNOSTIC_QUESTION_LIMIT,
): DiagnosticQuestion[] {
  const grade9 = roundRobinByTopic(all.filter((question) => question.grade === 9));
  const grade10 = roundRobinByTopic(all.filter((question) => question.grade === 10));

  const selected: DiagnosticQuestion[] = [];
  let i = 0;
  let j = 0;
  while (selected.length < limit && (i < grade9.length || j < grade10.length)) {
    const preferGrade9 = selected.length % 2 === 0;
    if (i < grade9.length && (preferGrade9 || j >= grade10.length)) {
      selected.push(grade9[i++]);
    } else if (j < grade10.length) {
      selected.push(grade10[j++]);
    } else if (i < grade9.length) {
      selected.push(grade9[i++]);
    }
  }
  return selected.slice(0, limit);
}

/** Marks the submitted answers and builds the per-topic diagnostic summary. */
export function gradeDiagnostic(
  questions: DiagnosticQuestion[],
  answersById: Map<string, string>,
): DiagnosticResult {
  const topics = new Map<string, TopicBreakdown>();
  const graded: GradedQuestion[] = [];
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
  };

  return { summary, graded };
}

/** A short, plain-language recommendation derived from the summary. */
export function buildRecommendation(summary: DiagnosticSummary): string {
  if (summary.totalQuestions === 0) return "Take the diagnostic to get personalised recommendations.";
  if (summary.weakTopics.length === 0 && summary.percentage >= 80) {
    return "Excellent work — keep your momentum with mixed practice across topics.";
  }
  if (summary.weakTopics.length > 0) {
    return `Start with focused practice on ${summary.weakTopics.slice(0, 3).join(", ")}, then retake the diagnostic to measure your progress.`;
  }
  return "Keep practising across topics to strengthen your overall readiness.";
}

/** Runtime guard for a summary loaded from an untrusted source (URL or DB jsonb). */
export function isDiagnosticSummary(value: unknown): value is DiagnosticSummary {
  if (!value || typeof value !== "object") return false;
  const candidate = value as Record<string, unknown>;
  return typeof candidate.percentage === "number" && Array.isArray(candidate.topics);
}

/** Compact, URL-safe transport of the summary to the result page (fallback path). */
export function encodeSummary(summary: DiagnosticSummary): string {
  return Buffer.from(JSON.stringify(summary)).toString("base64url");
}

export function decodeSummary(data: string): DiagnosticSummary | null {
  try {
    const parsed: unknown = JSON.parse(Buffer.from(data, "base64url").toString("utf8"));
    return isDiagnosticSummary(parsed) ? parsed : null;
  } catch {
    return null;
  }
}
