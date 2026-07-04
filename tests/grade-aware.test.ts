import { test, expect } from "vitest";
import {
  selectDiagnosticQuestions,
  gradeDiagnostic,
  isDiagnosticSummary,
  DIAGNOSTIC_QUESTION_LIMIT,
  type DiagnosticQuestion,
  type DiagnosticSummary,
} from "@/lib/math/diagnostic";
import { recommendNextTopic, type TopicPerformance, type TopicRef } from "@/lib/math/progress";
import { parseGrade, isValidGrade, DEFAULT_GRADE } from "@/lib/learner/profile";

function dq(over: Partial<DiagnosticQuestion>): DiagnosticQuestion {
  return {
    id: "q",
    question_text: "Solve x",
    answer_text: "1",
    difficulty: "easy",
    marks: 1,
    grade: 9,
    topic_id: "ta",
    topicName: "Topic A",
    topicSlug: "topic-a",
    ...over,
  };
}

// ---- Grade-scoped diagnostic selection ----

test("Grade 9 diagnostic contains only Grade 9 questions, round-robined across topics", () => {
  const pool: DiagnosticQuestion[] = [];
  for (let i = 0; i < 6; i++) pool.push(dq({ id: `g9-a-${i}`, grade: 9, topic_id: "a" }));
  for (let i = 0; i < 6; i++) pool.push(dq({ id: `g9-b-${i}`, grade: 9, topic_id: "b" }));
  for (let i = 0; i < 6; i++) pool.push(dq({ id: `g10-${i}`, grade: 10, topic_id: "a" }));

  const picked = selectDiagnosticQuestions(pool, DIAGNOSTIC_QUESTION_LIMIT, 9);
  expect(picked.every((q) => q.grade === 9)).toBe(true);
  // Round-robin: first two picks come from different topics.
  expect(picked[0].topic_id).not.toBe(picked[1].topic_id);
});

test("Grade 10 diagnostic contains only Grade 10 questions", () => {
  const pool: DiagnosticQuestion[] = [];
  for (let i = 0; i < 6; i++) pool.push(dq({ id: `g9-${i}`, grade: 9, topic_id: "a" }));
  for (let i = 0; i < 6; i++) pool.push(dq({ id: `g10-${i}`, grade: 10, topic_id: "a" }));

  const picked = selectDiagnosticQuestions(pool, DIAGNOSTIC_QUESTION_LIMIT, 10);
  expect(picked.length).toBeGreaterThan(0);
  expect(picked.every((q) => q.grade === 10)).toBe(true);
});

// ---- Grade stamped on the summary ----

test("gradeDiagnostic stamps the grade on the summary when provided", () => {
  const questions = [dq({ id: "1", grade: 10, answer_text: "1" })];
  const { summary } = gradeDiagnostic(questions, new Map([["1", "1"]]), 10);
  expect(summary.grade).toBe(10);
});

test("gradeDiagnostic leaves grade undefined when not provided (backward compatible)", () => {
  const questions = [dq({ id: "1", answer_text: "1" })];
  const { summary } = gradeDiagnostic(questions, new Map([["1", "1"]]));
  expect(summary.grade).toBeUndefined();
});

// ---- Backward compatibility with old persisted reports ----

test("an old diagnostic summary without a grade still validates", () => {
  const legacy: DiagnosticSummary = {
    score: 5, totalMarks: 10, correct: 5, totalQuestions: 10, percentage: 50,
    weakTopics: ["A"], strongTopics: [], topics: [{ topic: "A", slug: "a", correct: 1, total: 2, percentage: 50 }],
    // no `grade` field
  };
  expect(isDiagnosticSummary(legacy)).toBe(true);
  expect(legacy.grade).toBeUndefined();
});

// ---- Recommendation catalogue filtered by grade ----

function perf(over: Partial<TopicPerformance>): TopicPerformance {
  return {
    topicId: "t", topic: "T", slug: "t", grade: 9,
    attempts: 4, correct: 1, marks: 4, earned: 1, percentage: 25, ...over,
  };
}
function ref(over: Partial<TopicRef>): TopicRef {
  return { id: "t", name: "T", slug: "t", grade: 9, displayOrder: 1, ...over };
}

test("recommendNextTopic only ever returns a topic from the provided (grade-filtered) catalogue", () => {
  // Learner is weak in a Grade 9 topic, but the catalogue passed in is Grade 10 only.
  const performance = [perf({ topicId: "g9weak", grade: 9, percentage: 20 })];
  const grade10Catalogue = [ref({ id: "g10a", grade: 10, slug: "g10a" }), ref({ id: "g10b", grade: 10, slug: "g10b" })];

  const rec = recommendNextTopic(performance.filter((p) => p.grade === 10), grade10Catalogue);
  expect(rec).not.toBeNull();
  expect(rec!.grade).toBe(10);
});

// ---- parseGrade / isValidGrade helpers ----

test("parseGrade accepts 9 and 10 (string or number), rejects everything else", () => {
  expect(parseGrade("9")).toBe(9);
  expect(parseGrade("10")).toBe(10);
  expect(parseGrade(9)).toBe(9);
  expect(parseGrade("8")).toBeUndefined();
  expect(parseGrade("11")).toBeUndefined();
  expect(parseGrade("abc")).toBeUndefined();
  expect(parseGrade(undefined)).toBeUndefined();
  expect(isValidGrade(9)).toBe(true);
  expect(isValidGrade(7)).toBe(false);
  expect(DEFAULT_GRADE).toBe(9);
});
