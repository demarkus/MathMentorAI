import { test, expect } from "vitest";
import {
  explanationFor,
  selectPracticeQuestions,
  gradePractice,
  buildPracticeRecommendation,
  isPracticeSummary,
  encodePracticeSummary,
  decodePracticeSummary,
  PRACTICE_MAX_QUESTIONS,
  type PracticeQuestion,
  type PracticeSummary,
} from "@/lib/math/practice";

function pq(over: Partial<PracticeQuestion>): PracticeQuestion {
  return {
    id: "q",
    question_text: "Solve x",
    answer_text: "1",
    hint: "a hint",
    solution_steps: ["step one"],
    difficulty: "easy",
    marks: 1,
    grade: 9,
    topic_id: "ta",
    topicName: "Topic A",
    topicSlug: "topic-a",
    ...over,
  };
}

test("explanationFor: prefers solution steps, falls back to hint, else empty", () => {
  expect(explanationFor({ solution_steps: ["a", "b"] })).toEqual(["a", "b"]);
  expect(explanationFor({ solution_steps: [], hint: "h" })).toEqual(["h"]);
  expect(explanationFor({})).toEqual([]);
});

test("gradePractice: builds per-question results with answers and explanations", () => {
  const questions = [
    pq({ id: "1", answer_text: "8", solution_steps: ["subtract 7", "x = 8"] }),
    pq({ id: "2", answer_text: "4", hint: "expand first", solution_steps: [] }),
  ];
  const answers = new Map([
    ["1", "8"], // correct
    ["2", "9"], // incorrect
  ]);
  const summary = gradePractice(questions, answers);

  expect(summary.correct).toBe(1);
  expect(summary.totalQuestions).toBe(2);
  expect(summary.percentage).toBe(50);
  expect(summary.topicName).toBe("Topic A");

  const q1 = summary.questions.find((q) => q.questionId === "1")!;
  expect(q1.isCorrect).toBe(true);
  expect(q1.correctAnswer).toBe("8");
  expect(q1.explanation).toEqual(["subtract 7", "x = 8"]);

  const q2 = summary.questions.find((q) => q.questionId === "2")!;
  expect(q2.isCorrect).toBe(false);
  expect(q2.explanation).toEqual(["expand first"]); // hint fallback
});

test("selectPracticeQuestions: caps at the max", () => {
  const many = Array.from({ length: PRACTICE_MAX_QUESTIONS + 5 }, (_, i) => pq({ id: `q${i}` }));
  expect(selectPracticeQuestions(many).length).toBe(PRACTICE_MAX_QUESTIONS);
});

test("buildPracticeRecommendation: strong / low / mid-with-mistakes", () => {
  const base = { topicName: "A", topicSlug: "a", grade: 9, score: 0, totalMarks: 10, correct: 0, totalQuestions: 5 };
  const strong: PracticeSummary = { ...base, percentage: 90, questions: [] };
  expect(buildPracticeRecommendation(strong)).toMatch(/harder|mixed/i);

  const low: PracticeSummary = { ...base, percentage: 20, questions: [] };
  expect(buildPracticeRecommendation(low)).toMatch(/step by step|worked solutions/i);

  const mid: PracticeSummary = {
    ...base,
    percentage: 60,
    questions: [
      { questionId: "1", questionText: "q", submitted: "x", isCorrect: false, correctAnswer: "y", explanation: [], marks: 1, score: 0 },
    ],
  };
  expect(buildPracticeRecommendation(mid)).toMatch(/review/i);
});

test("encode/decode practice summary round-trips and the guard validates shape", () => {
  const summary: PracticeSummary = {
    topicName: "A", topicSlug: "a", grade: 9, score: 5, totalMarks: 10, correct: 5, totalQuestions: 10, percentage: 50,
    questions: [],
  };
  expect(decodePracticeSummary(encodePracticeSummary(summary))).toEqual(summary);
  expect(isPracticeSummary(summary)).toBe(true);
  expect(isPracticeSummary({})).toBe(false);
  expect(decodePracticeSummary("!!not-valid!!")).toBe(null);
});
