import { test, expect } from "vitest";
import {
  MAX_ANSWER_LENGTH,
  MAX_ACTIVE_ISSUED_SESSIONS,
  isAnswerWithinLimit,
  answersWithinLimit,
} from "@/lib/quiz/limits";
import { chooseSessionStart, type ActiveSessionRow } from "@/lib/quiz/session";

// ---- Answer length bounds (oversized answers) ----

test("an answer at the limit is accepted; one over is rejected", () => {
  expect(isAnswerWithinLimit("x".repeat(MAX_ANSWER_LENGTH))).toBe(true);
  expect(isAnswerWithinLimit("x".repeat(MAX_ANSWER_LENGTH + 1))).toBe(false);
});

test("answersWithinLimit is false when any answer is oversized", () => {
  const ok = [{ answer: "x = 5" }, { answer: "(x+2)(x+3)" }];
  const bad = [{ answer: "ok" }, { answer: "y".repeat(MAX_ANSWER_LENGTH + 1) }];
  expect(answersWithinLimit(ok)).toBe(true);
  expect(answersWithinLimit(bad)).toBe(false);
});

test("empty / null answers are within the limit", () => {
  expect(isAnswerWithinLimit("")).toBe(true);
  expect(isAnswerWithinLimit(null)).toBe(true);
});

// ---- Session reuse / cap (repeated starts, abuse cap) ----

function active(over: Partial<ActiveSessionRow> = {}): ActiveSessionRow {
  return { id: "s1", quizType: "practice", topicId: "t1", grade: 9, ...over };
}

test("a repeated start reuses a matching active session (same type + topic + grade)", () => {
  const rows = [active({ id: "existing", quizType: "practice", topicId: "t1", grade: 9 })];
  const decision = chooseSessionStart(rows, { quizType: "practice", topicId: "t1", grade: 9 });
  expect(decision).toEqual({ kind: "reuse", sessionId: "existing" });
});

test("a different topic/grade does not reuse — it creates", () => {
  const rows = [active({ id: "other", topicId: "t1", grade: 9 })];
  expect(chooseSessionStart(rows, { quizType: "practice", topicId: "t2", grade: 9 })).toEqual({ kind: "create" });
  expect(chooseSessionStart(rows, { quizType: "practice", topicId: "t1", grade: 10 })).toEqual({ kind: "create" });
  expect(chooseSessionStart(rows, { quizType: "diagnostic", topicId: null, grade: 9 })).toEqual({ kind: "create" });
});

test("a diagnostic reuses another active diagnostic (topic null, same grade)", () => {
  const rows = [active({ id: "diag", quizType: "diagnostic", topicId: null, grade: 10 })];
  expect(chooseSessionStart(rows, { quizType: "diagnostic", topicId: null, grade: 10 })).toEqual({
    kind: "reuse",
    sessionId: "diag",
  });
});

test("with no active sessions, the decision is to create", () => {
  expect(chooseSessionStart([], { quizType: "diagnostic", topicId: null, grade: 9 })).toEqual({ kind: "create" });
});

test("at the active-session cap with no match, starting is refused", () => {
  const rows: ActiveSessionRow[] = Array.from({ length: MAX_ACTIVE_ISSUED_SESSIONS }, (_, i) =>
    active({ id: `s${i}`, topicId: `topic-${i}`, grade: 9 }),
  );
  // A brand-new topic can't be started (would exceed the cap)…
  expect(chooseSessionStart(rows, { quizType: "practice", topicId: "topic-new", grade: 9 })).toEqual({
    kind: "at_limit",
  });
  // …but an already-active topic is still reused, never blocked.
  expect(chooseSessionStart(rows, { quizType: "practice", topicId: "topic-3", grade: 9 })).toEqual({
    kind: "reuse",
    sessionId: "s3",
  });
});
