import { test, expect } from "vitest";
import {
  MAX_ANSWER_LENGTH,
  MAX_ACTIVE_ISSUED_SESSIONS,
  isAnswerWithinLimit,
  answersWithinLimit,
} from "@/lib/quiz/limits";
import { chooseSessionStart, SESSION_REUSE_GRACE_MS, type ActiveSessionRow } from "@/lib/quiz/session";

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

// ---- Session reuse / supersede / cap (repeated starts, abuse cap) ----

const NOW = Date.parse("2026-07-07T12:00:00Z");
const FRESH_AT = new Date(NOW - 30_000).toISOString(); // 30s ago — within the grace window
const STALE_AT = new Date(NOW - SESSION_REUSE_GRACE_MS - 60_000).toISOString(); // abandoned

function active(over: Partial<ActiveSessionRow> = {}): ActiveSessionRow {
  return { id: "s1", quizType: "practice", topicId: "t1", grade: 9, createdAt: FRESH_AT, ...over };
}

function decide(rows: ActiveSessionRow[], want: Parameters<typeof chooseSessionStart>[1]) {
  return chooseSessionStart(rows, want, MAX_ACTIVE_ISSUED_SESSIONS, NOW);
}

test("a repeated start reuses a just-issued matching session (same type + topic + grade)", () => {
  const rows = [active({ id: "existing" })];
  expect(decide(rows, { quizType: "practice", topicId: "t1", grade: 9 })).toEqual({
    kind: "reuse",
    sessionId: "existing",
  });
});

test("an abandoned matching session is superseded, not resumed", () => {
  const rows = [active({ id: "stale", createdAt: STALE_AT })];
  expect(decide(rows, { quizType: "practice", topicId: "t1", grade: 9 })).toEqual({
    kind: "create",
    supersededIds: ["stale"],
  });
  // An unparseable timestamp counts as stale too (never resumed by accident).
  const broken = [active({ id: "broken", createdAt: "not-a-date" })];
  expect(decide(broken, { quizType: "practice", topicId: "t1", grade: 9 })).toEqual({
    kind: "create",
    supersededIds: ["broken"],
  });
});

test("a different topic/grade does not reuse — it creates without superseding", () => {
  const rows = [active({ id: "other", topicId: "t1", grade: 9 })];
  const create = { kind: "create", supersededIds: [] };
  expect(decide(rows, { quizType: "practice", topicId: "t2", grade: 9 })).toEqual(create);
  expect(decide(rows, { quizType: "practice", topicId: "t1", grade: 10 })).toEqual(create);
  expect(decide(rows, { quizType: "diagnostic", topicId: null, grade: 9 })).toEqual(create);
});

test("a diagnostic reuses another just-issued diagnostic (topic null, same grade)", () => {
  const rows = [active({ id: "diag", quizType: "diagnostic", topicId: null, grade: 10 })];
  expect(decide(rows, { quizType: "diagnostic", topicId: null, grade: 10 })).toEqual({
    kind: "reuse",
    sessionId: "diag",
  });
});

test("with no active sessions, the decision is to create", () => {
  expect(decide([], { quizType: "diagnostic", topicId: null, grade: 9 })).toEqual({
    kind: "create",
    supersededIds: [],
  });
});

test("at the active-session cap with no match, starting is refused", () => {
  const rows: ActiveSessionRow[] = Array.from({ length: MAX_ACTIVE_ISSUED_SESSIONS }, (_, i) =>
    active({ id: `s${i}`, topicId: `topic-${i}`, grade: 9 }),
  );
  // A brand-new topic can't be started (would exceed the cap)…
  expect(decide(rows, { quizType: "practice", topicId: "topic-new", grade: 9 })).toEqual({
    kind: "at_limit",
  });
  // …but an already-active topic is still reused, never blocked.
  expect(decide(rows, { quizType: "practice", topicId: "topic-3", grade: 9 })).toEqual({
    kind: "reuse",
    sessionId: "s3",
  });
});

test("at the cap, superseding an abandoned match frees its slot (never blocked)", () => {
  const rows: ActiveSessionRow[] = Array.from({ length: MAX_ACTIVE_ISSUED_SESSIONS }, (_, i) =>
    active({ id: `s${i}`, topicId: `topic-${i}`, grade: 9, createdAt: STALE_AT }),
  );
  expect(decide(rows, { quizType: "practice", topicId: "topic-3", grade: 9 })).toEqual({
    kind: "create",
    supersededIds: ["s3"],
  });
});
