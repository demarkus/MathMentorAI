import { test } from "node:test";
import assert from "node:assert/strict";
import {
  calculateAverageScore,
  calculateTopicPerformance,
  findWeakTopics,
  findStrongTopics,
  recommendNextTopic,
  summarizeRecentActivity,
  type ProgressAttempt,
  type ProgressSession,
  type TopicRef,
} from "../src/lib/math/progress.ts";

function attempt(over: Partial<ProgressAttempt>): ProgressAttempt {
  return {
    id: "a",
    questionText: "q",
    isCorrect: false,
    score: 0,
    marks: 1,
    topicId: "t",
    topicName: "Topic",
    topicSlug: "topic",
    grade: 9,
    createdAt: "2026-01-01T00:00:00Z",
    ...over,
  };
}

function session(over: Partial<ProgressSession>): ProgressSession {
  return { id: "s", quizType: "practice", score: 0, totalMarks: 0, percentage: 0, createdAt: "2026-01-01T00:00:00Z", ...over };
}

function ref(over: Partial<TopicRef>): TopicRef {
  return { id: "t", name: "Topic", slug: "topic", grade: 9, displayOrder: 0, ...over };
}

test("calculateAverageScore: empty -> 0", () => {
  assert.equal(calculateAverageScore([]), 0);
});

test("calculateAverageScore: averages recorded percentages", () => {
  assert.equal(
    calculateAverageScore([
      session({ totalMarks: 10, percentage: 80 }),
      session({ totalMarks: 10, percentage: 60 }),
    ]),
    70,
  );
});

test("calculateAverageScore: falls back to score/totalMarks when percentage missing", () => {
  assert.equal(calculateAverageScore([session({ score: 5, totalMarks: 10, percentage: 0 })]), 50);
});

test("calculateTopicPerformance: groups, computes accuracy, sorts by grade then pct desc", () => {
  const rows = calculateTopicPerformance([
    attempt({ topicId: "a", grade: 9, isCorrect: true, score: 1 }),
    attempt({ topicId: "a", grade: 9, isCorrect: false }),
    attempt({ topicId: "b", grade: 9, isCorrect: true, score: 1 }),
    attempt({ topicId: "b", grade: 9, isCorrect: true, score: 1 }),
  ]);
  assert.equal(rows.length, 2);
  // b (100%) sorts before a (50%) within the same grade.
  assert.equal(rows[0].topicId, "b");
  assert.equal(rows[0].percentage, 100);
  assert.equal(rows[1].topicId, "a");
  assert.equal(rows[1].percentage, 50);
});

test("findWeakTopics (<50) and findStrongTopics (>=75)", () => {
  const perf = calculateTopicPerformance([
    attempt({ topicId: "weak", isCorrect: false }),
    attempt({ topicId: "weak", isCorrect: false }),
    attempt({ topicId: "weak", isCorrect: true, score: 1 }), // 1/3 = 33%
    attempt({ topicId: "strong", isCorrect: true, score: 1 }),
    attempt({ topicId: "strong", isCorrect: true, score: 1 }), // 100%
  ]);
  assert.deepEqual(findWeakTopics(perf).map((t) => t.topicId), ["weak"]);
  assert.deepEqual(findStrongTopics(perf).map((t) => t.topicId), ["strong"]);
});

test("recommendNextTopic: weakest attempted topic first", () => {
  const perf = calculateTopicPerformance([
    attempt({ topicId: "c", isCorrect: false }),
    attempt({ topicId: "c", isCorrect: false }), // 0%
  ]);
  const topics = [ref({ id: "c", name: "Weak topic" }), ref({ id: "d", name: "Other" })];
  assert.equal(recommendNextTopic(perf, topics)?.id, "c");
});

test("recommendNextTopic: when no weak topics, recommend an unattempted topic", () => {
  const perf = calculateTopicPerformance([attempt({ topicId: "a", isCorrect: true, score: 1 })]);
  const topics = [ref({ id: "a" }), ref({ id: "d", name: "Unattempted" })];
  assert.equal(recommendNextTopic(perf, topics)?.id, "d");
});

test("recommendNextTopic: no performance -> first topic; no data -> null", () => {
  assert.equal(recommendNextTopic([], [ref({ id: "first" })])?.id, "first");
  assert.equal(recommendNextTopic([], []), null);
});

test("summarizeRecentActivity: newest first, capped at limit", () => {
  const items = summarizeRecentActivity(
    [
      attempt({ id: "old", createdAt: "2026-01-01T00:00:00Z" }),
      attempt({ id: "new", createdAt: "2026-03-01T00:00:00Z" }),
      attempt({ id: "mid", createdAt: "2026-02-01T00:00:00Z" }),
    ],
    2,
  );
  assert.deepEqual(items.map((i) => i.id), ["new", "mid"]);
});
