export const WEAK_TOPIC_THRESHOLD = 50;
export const STRONG_TOPIC_THRESHOLD = 75;

export type ProgressAttempt = {
  id: string;
  questionText: string;
  isCorrect: boolean;
  score: number;
  marks: number;
  topicId: string;
  topicName: string;
  topicSlug: string;
  grade: number;
  createdAt: string;
};

export type ProgressSession = {
  id: string;
  quizType: string;
  score: number;
  totalMarks: number;
  percentage: number;
  createdAt: string;
};

export type TopicPerformance = {
  topicId: string;
  topic: string;
  slug: string;
  grade: number;
  attempts: number;
  correct: number;
  marks: number;
  earned: number;
  percentage: number;
};

export type TopicRef = {
  id: string;
  name: string;
  slug: string;
  grade: number;
  displayOrder: number;
};

/** Mean percentage across completed quiz sessions that have marks recorded. */
export function calculateAverageScore(sessions: ProgressSession[]): number {
  const valid = sessions.filter((session) => session.totalMarks > 0);
  if (valid.length === 0) return 0;
  const sum = valid.reduce((total, session) => {
    const pct =
      typeof session.percentage === "number" && session.percentage > 0
        ? session.percentage
        : Math.round((session.score / session.totalMarks) * 100);
    return total + pct;
  }, 0);
  return Math.round(sum / valid.length);
}

/** Groups attempts by topic; percentage is question accuracy (correct / attempts). */
export function calculateTopicPerformance(attempts: ProgressAttempt[]): TopicPerformance[] {
  const byTopic = new Map<string, TopicPerformance>();
  for (const attempt of attempts) {
    const current = byTopic.get(attempt.topicId) ?? {
      topicId: attempt.topicId,
      topic: attempt.topicName,
      slug: attempt.topicSlug,
      grade: attempt.grade,
      attempts: 0,
      correct: 0,
      marks: 0,
      earned: 0,
      percentage: 0,
    };
    current.attempts += 1;
    current.marks += attempt.marks;
    if (attempt.isCorrect) {
      current.correct += 1;
      current.earned += attempt.score;
    }
    byTopic.set(attempt.topicId, current);
  }
  return [...byTopic.values()]
    .map((topic) => ({
      ...topic,
      percentage: topic.attempts ? Math.round((topic.correct / topic.attempts) * 100) : 0,
    }))
    .sort((a, b) => a.grade - b.grade || b.percentage - a.percentage);
}

/** Attempted topics scoring below the weak threshold, weakest first. */
export function findWeakTopics(performance: TopicPerformance[]): TopicPerformance[] {
  return performance
    .filter((topic) => topic.attempts > 0 && topic.percentage < WEAK_TOPIC_THRESHOLD)
    .sort((a, b) => a.percentage - b.percentage);
}

/** Attempted topics scoring at or above the strong threshold, strongest first. */
export function findStrongTopics(performance: TopicPerformance[]): TopicPerformance[] {
  return performance
    .filter((topic) => topic.attempts > 0 && topic.percentage >= STRONG_TOPIC_THRESHOLD)
    .sort((a, b) => b.percentage - a.percentage);
}

function toRef(topic: TopicPerformance): TopicRef {
  return { id: topic.topicId, name: topic.topic, slug: topic.slug, grade: topic.grade, displayOrder: 0 };
}

/**
 * Recommends the weakest attempted topic; otherwise the first active topic the
 * learner hasn't attempted; otherwise the lowest-scoring attempted topic.
 */
export function recommendNextTopic(performance: TopicPerformance[], topics: TopicRef[]): TopicRef | null {
  const weak = findWeakTopics(performance);
  if (weak.length > 0) {
    return topics.find((topic) => topic.id === weak[0].topicId) ?? toRef(weak[0]);
  }

  const attempted = new Set(performance.map((topic) => topic.topicId));
  const unattempted = topics.find((topic) => !attempted.has(topic.id));
  if (unattempted) return unattempted;

  if (performance.length > 0) {
    const weakest = [...performance].sort((a, b) => a.percentage - b.percentage)[0];
    return topics.find((topic) => topic.id === weakest.topicId) ?? toRef(weakest);
  }

  return topics[0] ?? null;
}

/** Most recent attempts first, capped at `limit`. */
export function summarizeRecentActivity(attempts: ProgressAttempt[], limit = 5): ProgressAttempt[] {
  return [...attempts]
    .sort((a, b) => (a.createdAt < b.createdAt ? 1 : a.createdAt > b.createdAt ? -1 : 0))
    .slice(0, limit);
}
