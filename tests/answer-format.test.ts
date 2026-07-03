import { test } from "node:test";
import assert from "node:assert/strict";
import { describeExpectedAnswer } from "../src/lib/math/answer-format.ts";

test("with answerText: numeric answer", () => {
  assert.equal(describeExpectedAnswer("Solve: 3x = 21", "7"), "Give a numeric answer.");
});

test("with answerText: equation answer", () => {
  assert.equal(describeExpectedAnswer("Solve: x + 1 = 6", "x = 5"), "Give an equation answer, e.g. x = 5.");
});

test("with answerText: expression answer", () => {
  assert.equal(
    describeExpectedAnswer("Factorise: x^2 + 5x + 6", "(x+2)(x+3)"),
    "Give a simplified expression.",
  );
});

test("without answerText: falls back to the question verb", () => {
  assert.equal(
    describeExpectedAnswer("Solve: 2x + 5 = 17"),
    "Give the value of the unknown, e.g. x = 5 or just 5.",
  );
  assert.equal(
    describeExpectedAnswer("Factorise: 6x + 12"),
    "Give your answer in factorised form, e.g. (x + 2)(x + 3).",
  );
  assert.equal(describeExpectedAnswer("Simplify: 6x / 3"), "Give a simplified expression.");
});

test("returns null when nothing can be inferred safely", () => {
  assert.equal(describeExpectedAnswer("Evaluate the following expression"), null);
  assert.equal(describeExpectedAnswer("Solve: 3x = 21", ""), "Give the value of the unknown, e.g. x = 5 or just 5.");
});
