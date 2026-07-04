import { test } from "vitest";
import assert from "node:assert/strict";
import { submittedMatchesIssued } from "../src/lib/quiz/session.ts";

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
