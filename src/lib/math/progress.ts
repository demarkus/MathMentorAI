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
  // Question difficulty ("easy" | "medium" | "hard"). Optional: attempts loaded
  // before this field was captured simply don't contribute to focus analysis.
  difficulty?: string;
  // CAPS cognitive level ("routine procedure" | "complex procedure" |
  // "problem solving"). Optional, same rule as difficulty.
  cognitiveLevel?: string;
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

// Minimum attempts on each side before a within-topic split is trusted — one
// lucky/unlucky question must not steer the recommendation.
export const FOCUS_MIN_ATTEMPTS = 2;

export type PracticeFocus = {
  topicId: string;
  // Which question property produced the split.
  basis: "cognitive" | "difficulty";
  hardAccuracy: number;
  hardAttempts: number;
  easierAccuracy: number;
  easierAttempts: number;
  message: string;
};

/**
 * Shared two-bucket split: reliable only when both sides have enough attempts,
 * the strong side clears STRONG_TOPIC_THRESHOLD, and the weak side falls below
 * WEAK_TOPIC_THRESHOLD. `classify` maps an attempt to its bucket (or null to
 * ignore it — e.g. legacy rows without the property).
 */
function splitFocus(
  attempts: ProgressAttempt[],
  topicId: string,
  classify: (attempt: ProgressAttempt) => "easier" | "hard" | null,
): { hardAccuracy: number; hardAttempts: number; easierAccuracy: number; easierAttempts: number } | null {
  let hardCorrect = 0;
  let hardAttempts = 0;
  let easierCorrect = 0;
  let easierAttempts = 0;

  for (const attempt of attempts) {
    if (attempt.topicId !== topicId) continue;
    const bucket = classify(attempt);
    if (bucket === "hard") {
      hardAttempts += 1;
      if (attempt.isCorrect) hardCorrect += 1;
    } else if (bucket === "easier") {
      easierAttempts += 1;
      if (attempt.isCorrect) easierCorrect += 1;
    }
  }

  if (hardAttempts < FOCUS_MIN_ATTEMPTS || easierAttempts < FOCUS_MIN_ATTEMPTS) return null;
  const hardAccuracy = Math.round((hardCorrect / hardAttempts) * 100);
  const easierAccuracy = Math.round((easierCorrect / easierAttempts) * 100);
  if (hardAccuracy >= WEAK_TOPIC_THRESHOLD || easierAccuracy < STRONG_TOPIC_THRESHOLD) return null;
  return { hardAccuracy, hardAttempts, easierAccuracy, easierAttempts };
}

/**
 * Detects a difficulty split inside one topic: the learner handles routine
 * (easy/medium) questions well but struggles on hard ones. Returns null when
 * there is no reliable split. Purely derived from existing attempt rows.
 */
export function findPracticeFocus(attempts: ProgressAttempt[], topicId: string): PracticeFocus | null {
  const split = splitFocus(attempts, topicId, (attempt) => {
    if (attempt.difficulty === "hard") return "hard";
    if (attempt.difficulty === "easy" || attempt.difficulty === "medium") return "easier";
    return null;
  });
  if (!split) return null;
  return {
    topicId,
    basis: "difficulty",
    ...split,
    message:
      `You're solid on routine questions here (${split.easierAccuracy}%), but harder ` +
      `problem-solving questions need work (${split.hardAccuracy}%) — focus your practice on those.`,
  };
}

/**
 * Detects a CAPS cognitive-level split inside one topic: routine procedures
 * mastered, but applied questions (complex procedure / problem solving)
 * failing. Only meaningful once the question bank is tagged — with the default
 * everywhere, every attempt lands in one bucket and this returns null.
 */
export function findCognitiveFocus(attempts: ProgressAttempt[], topicId: string): PracticeFocus | null {
  const split = splitFocus(attempts, topicId, (attempt) => {
    if (!attempt.cognitiveLevel) return null;
    if (attempt.cognitiveLevel === "routine procedure") return "easier";
    if (attempt.cognitiveLevel === "complex procedure" || attempt.cognitiveLevel === "problem solving") return "hard";
    return null;
  });
  if (!split) return null;
  return {
    topicId,
    basis: "cognitive",
    ...split,
    message:
      `You've mastered the routine mechanics here (${split.easierAccuracy}%), but applied ` +
      `problem-solving questions need work (${split.hardAccuracy}%) — practise the word problems in this topic.`,
  };
}

/** Most recent attempts first, capped at `limit`. */
export function summarizeRecentActivity(attempts: ProgressAttempt[], limit = 5): ProgressAttempt[] {
  return [...attempts]
    .sort((a, b) => (a.createdAt < b.createdAt ? 1 : a.createdAt > b.createdAt ? -1 : 0))
    .slice(0, limit);
}
