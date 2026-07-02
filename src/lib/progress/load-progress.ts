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

/**
 * Loads and computes a learner's progress. `attempts` is the primary source and
 * a hard error there sets `error`. quiz_sessions and reports are optional (they
 * only exist once the migrations are applied), so errors there are ignored.
 */
export async function loadLearnerProgress(
  supabase: SupabaseClient,
  learnerId: string,
): Promise<LearnerProgress> {
  const attemptsResult = await supabase
    .from("attempts")
    .select("id, is_correct, score, created_at, questions(marks, topic_id, question_text, grade, topics(name, slug))")
    .eq("learner_id", learnerId)
    .order("created_at", { ascending: false });

  if (attemptsResult.error) {
    return { ...EMPTY_PROGRESS, error: true };
  }

  const attempts = ((attemptsResult.data ?? []) as unknown as AttemptRow[])
    .map(mapAttempt)
    .filter((attempt): attempt is ProgressAttempt => attempt !== null);

  // Optional tables — ignore errors (treat as empty) when not yet migrated.
  const sessionsResult = await supabase
    .from("quiz_sessions")
    .select("id, quiz_type, score, total_marks, percentage, created_at")
    .eq("learner_id", learnerId)
    .order("created_at", { ascending: false });
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

  const topicsResult = await supabase
    .from("topics")
    .select("id, name, slug, grade, display_order")
    .order("grade", { ascending: true })
    .order("display_order", { ascending: true });
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
  const correctCount = attempts.filter((attempt) => attempt.isCorrect).length;
  const overallAccuracy = attempts.length ? Math.round((correctCount / attempts.length) * 100) : 0;
  const averageScore = sessions.length ? calculateAverageScore(sessions) : overallAccuracy;

  return {
    error: false,
    hasData: attempts.length > 0 || sessions.length > 0,
    totalQuizzes: sessions.length,
    totalAttempts: attempts.length,
    averageScore,
    averageBasis: sessions.length ? "quiz" : "attempts",
    topicPerformance,
    weakTopics: findWeakTopics(topicPerformance),
    strongTopics: findStrongTopics(topicPerformance),
    recentActivity: summarizeRecentActivity(attempts, 6),
    recommendedTopic: recommendNextTopic(topicPerformance, topics),
    latestDiagnostic,
  };
}
