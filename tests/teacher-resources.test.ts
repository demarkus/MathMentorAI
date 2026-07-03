import { test } from "node:test";
import assert from "node:assert/strict";
import {
  isMissingTableError,
  isGrade,
  isResourceType,
  isDifficultyOption,
  clampQuestionCount,
  resourceTypeLabel,
  explanationFrom,
  selectQuestions,
  defaultTitle,
  buildWorksheetContent,
  isWorksheetContent,
  DEFAULT_QUESTIONS,
  MAX_QUESTIONS,
  MIN_QUESTIONS,
  type SourceQuestion,
} from "../src/lib/math/teacher-resources.ts";

function q(over: Partial<SourceQuestion>): SourceQuestion {
  return {
    id: "q",
    question_text: "Solve x",
    answer_text: "1",
    hint: "hint",
    solution_steps: ["step"],
    difficulty: "easy",
    marks: 1,
    ...over,
  };
}

test("isMissingTableError: recognises absent-table codes/messages", () => {
  assert.equal(isMissingTableError({ code: "42P01" }), true);
  assert.equal(isMissingTableError({ code: "PGRST205" }), true);
  assert.equal(isMissingTableError({ message: "relation does not exist" }), true);
  assert.equal(isMissingTableError({ code: "23505", message: "duplicate" }), false);
  assert.equal(isMissingTableError(null), false);
  assert.equal(isMissingTableError(undefined), false);
});

test("isGrade: accepts 9/10 (incl. numeric strings), rejects others", () => {
  assert.equal(isGrade(9), true);
  assert.equal(isGrade("10"), true);
  assert.equal(isGrade(8), false);
  assert.equal(isGrade("nine"), false);
});

test("isResourceType / isDifficultyOption", () => {
  assert.equal(isResourceType("revision_pack"), true);
  assert.equal(isResourceType("quiz"), false);
  assert.equal(isDifficultyOption("mixed"), true);
  assert.equal(isDifficultyOption("expert"), false);
});

test("clampQuestionCount: clamps to [MIN, MAX] and defaults on junk", () => {
  assert.equal(clampQuestionCount(5), 5);
  assert.equal(clampQuestionCount(3.6), 4); // rounds
  assert.equal(clampQuestionCount(100), MAX_QUESTIONS);
  assert.equal(clampQuestionCount(-3), MIN_QUESTIONS);
  assert.equal(clampQuestionCount(0), DEFAULT_QUESTIONS); // 0 is falsy -> default
  assert.equal(clampQuestionCount(Number.NaN), DEFAULT_QUESTIONS);
});

test("resourceTypeLabel: maps values to labels", () => {
  assert.equal(resourceTypeLabel("memo"), "Memo");
  assert.equal(resourceTypeLabel("revision_pack"), "Revision pack");
});

test("explanationFrom: steps preferred, hint fallback, else empty", () => {
  assert.deepEqual(explanationFrom({ solution_steps: ["a", "b"] }), ["a", "b"]);
  assert.deepEqual(explanationFrom({ solution_steps: [], hint: "h" }), ["h"]);
  assert.deepEqual(explanationFrom({}), []);
});

test("selectQuestions: filters to a difficulty and caps at count", () => {
  const all = [q({ id: "e1", difficulty: "easy" }), q({ id: "m1", difficulty: "medium" }), q({ id: "e2", difficulty: "easy" })];
  assert.deepEqual(selectQuestions(all, 1, "easy").map((x) => x.id), ["e1"]);
});

test("selectQuestions: mixed round-robins easy -> medium -> hard", () => {
  const all = [
    q({ id: "e1", difficulty: "easy" }),
    q({ id: "e2", difficulty: "easy" }),
    q({ id: "m1", difficulty: "medium" }),
    q({ id: "h1", difficulty: "hard" }),
  ];
  assert.deepEqual(selectQuestions(all, 3, "mixed").map((x) => x.id), ["e1", "m1", "h1"]);
});

test("defaultTitle: composes label, grade, and topic", () => {
  assert.equal(defaultTitle(9, "Factorisation", "worksheet"), "Worksheet · Grade 9 Factorisation");
});

test("buildWorksheetContent: numbers questions, totals marks, notes shortfall", () => {
  const selected = [q({ id: "a", marks: 2 }), q({ id: "b", marks: 3 })];
  const content = buildWorksheetContent(
    { grade: 9, topicSlug: "factorisation", count: 5, difficulty: "mixed", resourceType: "worksheet" },
    { name: "Factorisation", slug: "factorisation", grade: 9 },
    selected,
  );
  assert.equal(content.generatedCount, 2);
  assert.equal(content.totalMarks, 5);
  assert.equal(content.questions[0].number, 1);
  assert.equal(content.questions[1].number, 2);
  assert.match(content.note ?? "", /Only 2 matching/);
  assert.equal(content.title, "Worksheet · Grade 9 Factorisation"); // fallback title
});

test("buildWorksheetContent: no note when the full count is met, uses provided title", () => {
  const selected = [q({ id: "a" }), q({ id: "b" })];
  const content = buildWorksheetContent(
    { grade: 10, topicSlug: "exponents", count: 2, difficulty: "easy", resourceType: "test", title: "  My Test  " },
    { name: "Exponents", slug: "exponents", grade: 10 },
    selected,
  );
  assert.equal(content.note, undefined);
  assert.equal(content.title, "My Test"); // trimmed
});

test("isWorksheetContent: guards jsonb read back from the DB", () => {
  assert.equal(isWorksheetContent({ title: "t", grade: 9, questions: [] }), true);
  assert.equal(isWorksheetContent({ title: "t", grade: "9", questions: [] }), false);
  assert.equal(isWorksheetContent({ title: "t", grade: 9 }), false);
  assert.equal(isWorksheetContent(null), false);
});
