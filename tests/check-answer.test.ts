import { test } from "node:test";
import assert from "node:assert/strict";
import { normalizeAnswer, isAnswerCorrect } from "../src/lib/math/check-answer.ts";

test("normalizeAnswer: trims, lowercases, and collapses whitespace", () => {
  assert.equal(normalizeAnswer("  X  Y  "), "x y");
});

test("normalizeAnswer: removes optional spaces around operators", () => {
  assert.equal(normalizeAnswer("x + 2"), "x+2");
  assert.equal(normalizeAnswer("x ^ 2"), "x^2");
  assert.equal(normalizeAnswer("3 = x"), "3=x");
  // Documented limitation: a space in implicit multiplication is NOT removed
  // (it's not adjacent to an operator), so "2 x" stays "2 x".
  assert.equal(normalizeAnswer("2 x + 1"), "2 x+1");
});

test("normalizeAnswer: maps × and · to * and unifies via NFKC", () => {
  assert.equal(normalizeAnswer("2 × 3"), "2*3");
  assert.equal(normalizeAnswer("a · b"), "a*b");
});

test("isAnswerCorrect: exact match after normalization", () => {
  assert.equal(isAnswerCorrect("(x+2)(x+3)", "(x + 2)(x + 3)"), true);
  assert.equal(isAnswerCorrect("6(X + 2)", "6(x+2)"), true);
});

test("isAnswerCorrect: empty learner answer is always incorrect", () => {
  assert.equal(isAnswerCorrect("", "5"), false);
  assert.equal(isAnswerCorrect("   ", "5"), false);
});

test("isAnswerCorrect: limited x=5 <-> 5 equivalence, both directions", () => {
  assert.equal(isAnswerCorrect("x = 5", "5"), true);
  assert.equal(isAnswerCorrect("5", "x = 5"), true);
  assert.equal(isAnswerCorrect("x=5", "5"), true);
});

test("isAnswerCorrect: different variables are NOT reconciled", () => {
  assert.equal(isAnswerCorrect("y = 5", "x = 5"), false);
});

test("isAnswerCorrect: same-variable assignments still compare values", () => {
  assert.equal(isAnswerCorrect("x = 5", "x=5"), true);
  assert.equal(isAnswerCorrect("x = 6", "x = 5"), false);
});

test("isAnswerCorrect: documented limitation — factor order is not equal", () => {
  // No symbolic algebra: reordered factors are treated as different strings.
  assert.equal(isAnswerCorrect("(x+3)(x+2)", "(x+2)(x+3)"), false);
});

test("isAnswerCorrect: documented limitation — 1/2 and 0.5 are not reconciled", () => {
  assert.equal(isAnswerCorrect("0.5", "1/2"), false);
});
