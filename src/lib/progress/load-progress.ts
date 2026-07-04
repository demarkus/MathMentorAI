import type { SupabaseClient } from "@supabase/supabase-js";
import {
  calculateAverageScore,
  calculateTopicPerformance,
  findWeakTopics,
  findStrongTopics,
  recommendNextTopic,
  summarizeRecentActivity,
  type ProgressAttempt,
  type ProgressSession,
  type TopicPerformance,
  type TopicRef,
} from "@/lib/math/progress";
import { isDiagnosticSummary, type DiagnosticSummary } from "@/lib/math/diagnostic";

type TopicEmbed = { name: string; slug: string } | { name: string; slug: string }[] | null;
type QuestionEmbed = {
  marks: number;
  topic_id: string;
  question_text: string;
  grade: number;
  topics: TopicEmbed;
};
type AttemptRow = {
  id: string;
  is_correct: boolean;
  score: number | string;
  created_at: string;
  questions: QuestionEmbed | QuestionEmbed[] | null;
};
type SessionRow = {
  id: string;
  quiz_type: string;
  score: number | string;
  total_marks: number | string;
  percentage: number | string;
  created_at: string;
};
type TopicRow = { id: string; name: string; slug: string; grade: number; display_order: number };

export type LearnerProgress = {
  error: boolean;
  hasData: boolean;
  totalQuizzes: number;
  totalAttempts: number;
  averageScore: number;
  averageBasis: "quiz" | "attempts";
  topicPerformance: TopicPerformance[];
  weakTopics: TopicPerformance[];
  strongTopics: TopicPerformance[];
  recentActivity: ProgressAttempt[];
  recommendedTopic: TopicRef | null;
  latestDiagnostic: DiagnosticSummary | null;
};

function num(value: number | string): number {
  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function mapAttempt(row: AttemptRow): ProgressAttempt | null {
  const question = Array.isArray(row.questions) ? row.questions[0] : row.questions;
  if (!question) return null;
  const topic = Array.isArray(question.topics) ? question.topics[0] : question.topics;
  return {
    id: row.id,
    questionText: question.question_text,
    isCorrect: row.is_correct,
    score: num(row.score),
    marks: num(question.marks),
    topicId: question.topic_id,
    topicName: topic?.name ?? "Algebra",
    topicSlug: topic?.slug ?? "",
    grade: question.grade,
    createdAt: row.created_at,
  };
}

const EMPTY_PROGRESS: LearnerProgress = {
  error: false,
  hasData: false,
  totalQuizzes: 0,
  totalAttempts: 0,
  averageScore: 0,
  averageBasis: "attempts",
  topicPerformance: [],
  weakTopics: [],
  strongTopics: [],
  recentActivity: [],
  recommendedTopic: null,
  latestDiagnostic: null,
};

// Bounded scans keep progress loading scalable: the per-topic breakdown and the
// recent-activity list read at most this many recent rows instead of a learner's
// whole history. Headline totals + accuracy use exact COUNT aggregates so they
// remain correct regardless of the bound.
const RECENT_ATTEMPT_SCAN = 500;
const RECENT_SESSION_SCAN = 200;

/**
 * Loads and computes a learner's progress. `attempts` is the primary source and
 * a hard error there sets `error`. quiz_sessions and reports are optional (they
 * only exist once the migrations are applied), so errors there are ignored.
 *
 * Scalable by design: totals + accuracy come from COUNT aggregates (no rows
 * transferred); the topic breakdown and recent-activity list are computed from a
 * bounded window of the most recent attempts/sessions.
 */
export async function loadLearnerProgress(
  supabase: SupabaseClient,
  learnerId: string,
  grade?: number,
): Promise<LearnerProgress> {
  // Exact totals via COUNT(head) — no rows transferred.
  const totalAttemptsResult = await supabase
    .from("attempts")
    .select("id", { count: "exact", head: true })
    .eq("learner_id", learnerId);
  if (totalAttemptsResult.error) {
    return { ...EMPTY_PROGRESS, error: true };
  }
  const totalAttempts = totalAttemptsResult.count ?? 0;

  const correctResult = await supabase
    .from("attempts")
    .select("id", { count: "exact", head: true })
    .eq("learner_id", learnerId)
    .eq("is_correct", true);
  if (correctResult.error) {
    return { ...EMPTY_PROGRESS, error: true };
  }
  const correctCount = correctResult.count ?? 0;

  // Bounded recent window for the per-topic breakdown + recent activity.
  const attemptsResult = await supabase
    .from("attempts")
    .select("id, is_correct, score, created_at, questions(marks, topic_id, question_text, grade, topics(name, slug))")
    .eq("learner_id", learnerId)
    .order("created_at", { ascending: false })
    .limit(RECENT_ATTEMPT_SCAN);

  if (attemptsResult.error) {
    return { ...EMPTY_PROGRESS, error: true };
  }

  const attempts = ((attemptsResult.data ?? []) as unknown as AttemptRow[])
    .map(mapAttempt)
    .filter((attempt): attempt is ProgressAttempt => attempt !== null);

  // Optional tables — ignore errors (treat as empty) when not yet migrated.
  // Only submitted sessions count as completed quizzes (issued/abandoned ones
  // don't). Exact count for the headline, bounded scan for the average.
  const totalQuizzesResult = await supabase
    .from("quiz_sessions")
    .select("id", { count: "exact", head: true })
    .eq("learner_id", learnerId)
    .eq("status", "submitted");
  const totalQuizzes = totalQuizzesResult.error ? 0 : totalQuizzesResult.count ?? 0;

  const sessionsResult = await supabase
    .from("quiz_sessions")
    .select("id, quiz_type, score, total_marks, percentage, created_at")
    .eq("learner_id", learnerId)
    .eq("status", "submitted")
    .order("created_at", { ascending: false })
    .limit(RECENT_SESSION_SCAN);
  const sessions: ProgressSession[] = sessionsResult.error
    ? []
    : ((sessionsResult.data ?? []) as unknown as SessionRow[]).map((row) => ({
        id: row.id,
        quizType: row.quiz_type,
        score: num(row.score),
        totalMarks: num(row.total_marks),
        percentage: num(row.percentage),
        createdAt: row.created_at,
      }));

  // Grade-scope the recommendation catalogue so we never recommend a topic from
  // another grade. When no grade is given, fall back to the full catalogue.
  let topicsQuery = supabase
    .from("topics")
    .select("id, name, slug, grade, display_order")
    .order("grade", { ascending: true })
    .order("display_order", { ascending: true });
  if (grade !== undefined) topicsQuery = topicsQuery.eq("grade", grade);
  const topicsResult = await topicsQuery;
  const topics: TopicRef[] = topicsResult.error
    ? []
    : ((topicsResult.data ?? []) as unknown as TopicRow[]).map((row) => ({
        id: row.id,
        name: row.name,
        slug: row.slug,
        grade: row.grade,
        displayOrder: row.display_order,
      }));

  const reportResult = await supabase
    .from("reports")
    .select("data, created_at")
    .eq("learner_id", learnerId)
    .eq("report_type", "diagnostic")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  const reportPayload = reportResult.error ? null : (reportResult.data as { data: unknown } | null)?.data;
  const latestDiagnostic = isDiagnosticSummary(reportPayload) ? reportPayload : null;

  const topicPerformance = calculateTopicPerformance(attempts);
  // Accuracy from exact counts (whole history); average from submitted sessions.
  const overallAccuracy = totalAttempts ? Math.round((correctCount / totalAttempts) * 100) : 0;
  const averageScore = sessions.length ? calculateAverageScore(sessions) : overallAccuracy;

  // Only recommend within the learner's grade: scope the performance the
  // recommender considers so a legacy cross-grade attempt can't surface a
  // different grade's topic.
  const recommendPerformance =
    grade === undefined ? topicPerformance : topicPerformance.filter((topic) => topic.grade === grade);

  return {
    error: false,
    hasData: totalAttempts > 0 || totalQuizzes > 0,
    totalQuizzes,
    totalAttempts,
    averageScore,
    averageBasis: sessions.length ? "quiz" : "attempts",
    topicPerformance,
    weakTopics: findWeakTopics(topicPerformance),
    strongTopics: findStrongTopics(topicPerformance),
    recentActivity: summarizeRecentActivity(attempts, 6),
    recommendedTopic: recommendNextTopic(recommendPerformance, topics),
    latestDiagnostic,
  };
}
