import { test, expect } from "vitest";
import {
  gradeDiagnostic,
  buildRecommendation,
  weakestTopic,
  selectDiagnosticQuestions,
  isDiagnosticSummary,
  isDiagnosticReviewItem,
  DIAGNOSTIC_QUESTION_LIMIT,
  type DiagnosticQuestion,
  type DiagnosticSummary,
} from "@/lib/math/diagnostic";

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

test("gradeDiagnostic: scores answers and builds per-topic breakdown", () => {
  const questions = [
    dq({ id: "1", topic_id: "ta", answer_text: "6(x+2)" }),
    dq({ id: "2", topic_id: "ta", answer_text: "8" }),
    dq({ id: "3", topic_id: "tb", topicName: "Topic B", topicSlug: "topic-b", answer_text: "5" }),
  ];
  const answers = new Map([
    ["1", "6(x + 2)"], // correct (normalised)
    ["2", "wrong"], // incorrect
    ["3", "nope"], // incorrect
  ]);

  const { summary, graded } = gradeDiagnostic(questions, answers);
  expect(summary.correct).toBe(1);
  expect(summary.totalQuestions).toBe(3);
  expect(summary.score).toBe(1);
  expect(summary.totalMarks).toBe(3);
  expect(summary.percentage).toBe(33); // 1/3 rounded
  // Topic A = 1/2 = 50% (not weak); Topic B = 0% (weak, <50).
  expect(summary.weakTopics).toContain("Topic B");
  expect(summary.weakTopics).not.toContain("Topic A");
  expect(graded.find((g) => g.questionId === "1")?.isCorrect).toBe(true);
  expect(graded.find((g) => g.questionId === "2")?.isCorrect).toBe(false);
});

test("gradeDiagnostic: builds a per-question review with answers, hints, and steps", () => {
  const questions = [
    dq({ id: "1", question_text: "Solve x+1=2", answer_text: "1", hint: "Subtract 1", solution_steps: ["x+1=2", "x=1"] }),
    dq({ id: "2", question_text: "Solve x-1=4", answer_text: "5" }), // no hint / steps
  ];
  const answers = new Map([["1", "1"]]); // question 2 left blank

  const { summary } = gradeDiagnostic(questions, answers);
  expect(summary.review).toHaveLength(2);
  expect(summary.review?.every(isDiagnosticReviewItem)).toBe(true);

  const first = summary.review?.[0];
  expect(first).toMatchObject({
    questionId: "1",
    questionText: "Solve x+1=2",
    submitted: "1",
    isCorrect: true,
    correctAnswer: "1",
    hint: "Subtract 1",
    explanation: ["x+1=2", "x=1"],
  });

  const second = summary.review?.[1];
  expect(second).toMatchObject({ questionId: "2", submitted: "", isCorrect: false, correctAnswer: "5", explanation: [] });
  expect(second?.hint).toBeUndefined();

  // Guards stay backward compatible: a summary without a review still validates,
  // and one with a non-array review does not.
  expect(isDiagnosticSummary({ percentage: 50, topics: [] })).toBe(true);
  expect(isDiagnosticSummary({ percentage: 50, topics: [], review: "nope" })).toBe(false);
});

test("weakestTopic: returns the lowest-scoring attempted topic", () => {
  const questions = [
    dq({ id: "1", topic_id: "ta", topicName: "A", answer_text: "1" }),
    dq({ id: "2", topic_id: "tb", topicName: "B", answer_text: "1" }),
  ];
  const answers = new Map([
    ["1", "1"], // A correct -> 100%
    ["2", "x"], // B wrong -> 0%
  ]);
  const { summary } = gradeDiagnostic(questions, answers);
  expect(weakestTopic(summary)?.topic).toBe("B");
});

test("buildRecommendation: reflects weak topics / strong / low bands", () => {
  const empty: DiagnosticSummary = {
    score: 0, totalMarks: 0, correct: 0, totalQuestions: 0, percentage: 0,
    weakTopics: [], strongTopics: [], topics: [],
  };
  expect(buildRecommendation(empty)).toMatch(/take the diagnostic/i);

  const strong: DiagnosticSummary = {
    score: 9, totalMarks: 10, correct: 9, totalQuestions: 10, percentage: 90,
    weakTopics: [], strongTopics: ["A"],
    topics: [{ topic: "A", slug: "a", correct: 9, total: 10, percentage: 90 }],
  };
  expect(buildRecommendation(strong)).toMatch(/harder|mixed/i);

  const weak: DiagnosticSummary = {
    score: 1, totalMarks: 10, correct: 1, totalQuestions: 10, percentage: 10,
    weakTopics: ["Factorisation"], strongTopics: [],
    topics: [{ topic: "Factorisation", slug: "f", correct: 1, total: 10, percentage: 10 }],
  };
  expect(buildRecommendation(weak)).toMatch(/Factorisation/);
});

test("selectDiagnosticQuestions: caps at the limit and never mixes in another grade", () => {
  const many: DiagnosticQuestion[] = [];
  for (let i = 0; i < 14; i++) many.push(dq({ id: `g9-${i}`, grade: 9, topic_id: `t${i % 3}` }));
  for (let i = 0; i < 14; i++) many.push(dq({ id: `g10-${i}`, grade: 10, topic_id: `t${i % 3}` }));

  const g9 = selectDiagnosticQuestions(many, DIAGNOSTIC_QUESTION_LIMIT, 9);
  expect(g9.length).toBe(DIAGNOSTIC_QUESTION_LIMIT);
  expect(g9.every((q) => q.grade === 9)).toBe(true);

  const g10 = selectDiagnosticQuestions(many, DIAGNOSTIC_QUESTION_LIMIT, 10);
  expect(g10.length).toBe(DIAGNOSTIC_QUESTION_LIMIT);
  expect(g10.every((q) => q.grade === 10)).toBe(true);
});

test("the diagnostic summary guard validates shape", () => {
  const summary: DiagnosticSummary = {
    score: 5, totalMarks: 10, correct: 5, totalQuestions: 10, percentage: 50,
    weakTopics: ["A"], strongTopics: [], topics: [{ topic: "A", slug: "a", correct: 1, total: 2, percentage: 50 }],
  };
  expect(isDiagnosticSummary(summary)).toBe(true);
  expect(isDiagnosticSummary({})).toBe(false);
  expect(isDiagnosticSummary(null)).toBe(false);
  expect(isDiagnosticSummary({ percentage: 50 })).toBe(false);
});
