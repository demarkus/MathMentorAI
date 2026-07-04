import { test } from "vitest";
import assert from "node:assert/strict";
import {
  submittedMatchesIssued,
  isSessionRunnable,
  isSessionExpired,
  type IssuedSession,
} from "../src/lib/quiz/session.ts";

const NOW = 1_000_000_000_000; // fixed clock for deterministic expiry tests

function issued(over: Partial<IssuedSession> = {}): IssuedSession {
  return {
    id: "s1",
    learnerId: "l1",
    quizType: "diagnostic",
    topicId: null,
    grade: null,
    questionIds: ["a", "b"],
    status: "issued",
    expiresAt: new Date(NOW + 60_000).toISOString(), // 1 min in the future
    ...over,
  };
}

test("submittedMatchesIssued: exact set (any order) matches", () => {
  assert.equal(submittedMatchesIssued(["a", "b", "c"], ["c", "a", "b"]), true);
});

test("submittedMatchesIssued: a missing id fails", () => {
  assert.equal(submittedMatchesIssued(["a", "b"], ["a", "b", "c"]), false);
});

test("submittedMatchesIssued: an additional (not-issued) id fails", () => {
  assert.equal(submittedMatchesIssued(["a", "b", "c", "d"], ["a", "b", "c"]), false);
});

test("submittedMatchesIssued: a duplicate id fails", () => {
  assert.equal(submittedMatchesIssued(["a", "b", "b"], ["a", "b", "c"]), false);
});

test("submittedMatchesIssued: swapped-for-not-issued id fails", () => {
  assert.equal(submittedMatchesIssued(["a", "b", "x"], ["a", "b", "c"]), false);
});

test("submittedMatchesIssued: empty vs empty matches", () => {
  assert.equal(submittedMatchesIssued([], []), true);
});

// ---- isSessionRunnable ----

test("isSessionRunnable: a null session is not runnable", () => {
  assert.equal(isSessionRunnable(null, "diagnostic", NOW), false);
});

test("isSessionRunnable: a fresh issued session of the right type is runnable", () => {
  assert.equal(isSessionRunnable(issued(), "diagnostic", NOW), true);
});

test("isSessionRunnable: the wrong quiz type is not runnable", () => {
  assert.equal(isSessionRunnable(issued({ quizType: "practice" }), "diagnostic", NOW), false);
});

test("isSessionRunnable: an already-submitted session is not runnable", () => {
  assert.equal(isSessionRunnable(issued({ status: "submitted" }), "diagnostic", NOW), false);
});

test("isSessionRunnable: an expired issued session is not runnable", () => {
  const expired = issued({ expiresAt: new Date(NOW - 1).toISOString() });
  assert.equal(isSessionRunnable(expired, "diagnostic", NOW), false);
});

test("isSessionRunnable: a null expiry (legacy) issued session is runnable", () => {
  assert.equal(isSessionRunnable(issued({ expiresAt: null }), "diagnostic", NOW), true);
});

// ---- isSessionExpired ----

test("isSessionExpired: a future expiry is not expired", () => {
  assert.equal(isSessionExpired(issued(), NOW), false);
});

test("isSessionExpired: a past expiry on an issued session is expired", () => {
  assert.equal(isSessionExpired(issued({ expiresAt: new Date(NOW - 1).toISOString() }), NOW), true);
});

test("isSessionExpired: a submitted session is never expired (idempotent retry)", () => {
  const submittedPast = issued({ status: "submitted", expiresAt: new Date(NOW - 1).toISOString() });
  assert.equal(isSessionExpired(submittedPast, NOW), false);
});
