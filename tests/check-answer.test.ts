import { test } from "vitest";
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

test("normalizeAnswer: unicode superscripts become caret exponents", () => {
  assert.equal(normalizeAnswer("x²"), "x^2"); // NFKC alone would fold this into "x2"
  assert.equal(normalizeAnswer("x² + 3x"), "x^2+3x");
  assert.equal(normalizeAnswer("x²³"), "x^23"); // consecutive superscript digits combine
  assert.equal(normalizeAnswer("x⁻¹"), "x^-1");
});

test("isAnswerCorrect: unicode superscript answers match caret answers", () => {
  assert.equal(isAnswerCorrect("x²+3x", "x^2+3x"), true);
  assert.equal(isAnswerCorrect("x² + 2x + 1", "1+2x+x^2"), true); // composes with symbolic term order
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

test("isAnswerCorrect: reordered factors are equal", () => {
  assert.equal(isAnswerCorrect("(x+3)(x+2)", "(x+2)(x+3)"), true);
  assert.equal(isAnswerCorrect("(2x+5)(2x-5)", "(2x-5)(2x+5)"), true);
  // A shared leading monomial is preserved through the reorder.
  assert.equal(isAnswerCorrect("2(x+2)(x-2)", "2(x-2)(x+2)"), true);
  assert.equal(isAnswerCorrect("x(x+2)(x-2)", "x(x-2)(x+2)"), true);
  // Repeated factors compare as a multiset.
  assert.equal(isAnswerCorrect("(x-3)(x-3)", "(x-3)(x-3)"), true);
});

test("isAnswerCorrect: factor reordering stays conservative", () => {
  // Different leading parts are not reconciled.
  assert.equal(isAnswerCorrect("2(x+2)(x-2)", "x(x-2)(x+2)"), false);
  // Different factor multisets stay unequal.
  assert.equal(isAnswerCorrect("(x+2)(x+2)", "(x+2)(x+3)"), false);
  assert.equal(isAnswerCorrect("(x+2)", "(x+2)(x+3)"), false);
  // A "/" or "^" before the brackets makes reordering meaning-changing — skipped.
  assert.equal(isAnswerCorrect("1/(x+3)(x+2)", "1/(x+2)(x+3)"), false);
  assert.equal(isAnswerCorrect("2^(x+3)(x+2)", "2^(x+2)(x+3)"), false);
});

test("isAnswerCorrect: same-form symbolic equivalence (term order, spacing)", () => {
  assert.equal(isAnswerCorrect("(2+x)(x+3)", "(x+2)(x+3)"), true); // commuted terms inside a factor
  assert.equal(isAnswerCorrect("1+2x+x^2", "x^2+2x+1"), true); // term order in a plain polynomial
  assert.equal(isAnswerCorrect("3x+x^2", "x^2+3x"), true);
  assert.equal(isAnswerCorrect("2 x+1", "2x+1"), true); // implicit-multiplication spacing
  assert.equal(isAnswerCorrect("y+x", "x+y"), true); // multivariable commutativity
  assert.equal(isAnswerCorrect("x(x+2)", "(x+2)x"), true); // juxtaposition = product, either side
});

test("isAnswerCorrect: symbolic never credits unsimplified computations of a numeric answer", () => {
  assert.equal(isAnswerCorrect("2+2", "4"), false);
  assert.equal(isAnswerCorrect("x=2+x-x+2", "x=4"), false); // equals 4, but isn't the answer "4"
  // ("8/2" for "4" IS accepted — that's the long-standing exact-rational path,
  // same rule that accepts "1/2" for "0.5".)
});

test("isAnswerCorrect: symbolic equivalence never crosses written forms", () => {
  // "Factorise: x^2-9" echoed back must NOT be marked correct.
  assert.equal(isAnswerCorrect("x^2-9", "(x-3)(x+3)"), false);
  assert.equal(isAnswerCorrect("x^2+5x+6", "(x+2)(x+3)"), false); // expanded for factorised
  assert.equal(isAnswerCorrect("(x+1)^2", "x^2+2x+1"), false); // factorised for expanded
  assert.equal(isAnswerCorrect("6x/3", "2x"), false); // unsimplified fraction for its value
  assert.equal(isAnswerCorrect("(x^2-9)/(x-3)", "x+3"), false); // unsimplified algebraic fraction
});

test("isAnswerCorrect: symbolic accepts reorderings but NOT same-form simplifications", () => {
  // A learner echoing the question at a "Simplify:" prompt must NOT get marks,
  // even though the two sides are mathematically equal and the same (plain) form.
  assert.equal(isAnswerCorrect("x^3*x^4", "x^7"), false); // exponent law not applied
  assert.equal(isAnswerCorrect("x^3 × x^4", "x^7"), false); // as the learner would type it
  assert.equal(isAnswerCorrect("3x+2x", "5x"), false); // like terms not collected
  assert.equal(isAnswerCorrect("2x+3x", "5x"), false);
  assert.equal(isAnswerCorrect("x+x", "2x"), false);
  // Pure reorderings (same tokens) are still accepted — the fix is surgical.
  assert.equal(isAnswerCorrect("(2+x)(x+3)", "(x+2)(x+3)"), true);
  assert.equal(isAnswerCorrect("1+2x+x^2", "x^2+2x+1"), true);
  assert.equal(isAnswerCorrect("y+x", "x+y"), true);
  // Anagram but NOT equal stays rejected (mathjs still does the real check).
  assert.equal(isAnswerCorrect("x+2y", "2x+y"), false);
});

test("isAnswerCorrect: the symbolic fallback stays guarded", () => {
  assert.equal(isAnswerCorrect("2x", "x2"), false); // "x2" is its own symbol, not 2*x
  assert.equal(isAnswerCorrect("(x+1)^13+x", "x+(x+1)^13"), false); // exponent above the safety cap
  assert.equal(isAnswerCorrect("x+2", "x+3"), false); // nonzero difference stays incorrect
  // "/" reads left to right, so reordering brackets around it still changes meaning.
  assert.equal(isAnswerCorrect("1/(x+3)(x+2)", "1/(x+2)(x+3)"), false);
});

test("isAnswerCorrect: exact fraction <-> decimal equivalence", () => {
  assert.equal(isAnswerCorrect("0.5", "1/2"), true);
  assert.equal(isAnswerCorrect("1/2", "0.5"), true);
  assert.equal(isAnswerCorrect("0.125", "1/8"), true);
  assert.equal(isAnswerCorrect("-0.75", "-3/4"), true);
  assert.equal(isAnswerCorrect("x = 0.5", "1/2"), true); // composes with x=5 <-> 5
  assert.equal(isAnswerCorrect("5.0", "5"), true);
});

test("isAnswerCorrect: fraction <-> decimal is exact, never approximate", () => {
  assert.equal(isAnswerCorrect("0.33", "1/3"), false);
  assert.equal(isAnswerCorrect("0.3333333333", "1/3"), false);
  assert.equal(isAnswerCorrect("0.5", "1/3"), false);
  assert.equal(isAnswerCorrect("1/0", "0"), false); // zero denominator never matches
});

test("isAnswerCorrect: multi-root answers match in any order", () => {
  assert.equal(isAnswerCorrect("x=3 or x=2", "x=2orx=3"), true); // seed stores 'x=2orx=3'
  assert.equal(isAnswerCorrect("x = 2 or x = 3", "x=2orx=3"), true);
  assert.equal(isAnswerCorrect("2, 3", "x=2orx=3"), true); // bare values via the x=5 <-> 5 tolerance
  assert.equal(isAnswerCorrect("x=2; x=3", "x=2 or x=3"), true);
});

test("isAnswerCorrect: '/' separates roots only between assignments, never inside fractions", () => {
  // "/" as a root separator ("x=2 / x=3" marking style), in both directions.
  assert.equal(isAnswerCorrect("x=2/x=3", "x=2orx=3"), true);
  assert.equal(isAnswerCorrect("x = 2 / x = 3", "x=2 or x=3"), true);
  assert.equal(isAnswerCorrect("x=3/x=2", "x=2orx=3"), true); // still order-insensitive
  // "/" stays division when any piece isn't an assignment.
  assert.equal(isAnswerCorrect("1/2", "0.5"), true); // fraction intact, not roots "1" and "2"
  assert.equal(isAnswerCorrect("x=1/2", "0.5"), true); // fraction value inside an assignment
  assert.equal(isAnswerCorrect("1/2", "x=1orx=2"), false); // a fraction is not the root set {1, 2}
  // Fraction-valued roots still work with the explicit separators.
  assert.equal(isAnswerCorrect("x=1/4 or x=1/2", "x=1/2orx=1/4"), true);
});

test("isAnswerCorrect: rational equivalence covers unsimplified and trailing-zero forms", () => {
  assert.equal(isAnswerCorrect("2/4", "1/2"), true); // unsimplified fraction, same value
  assert.equal(isAnswerCorrect("0.50", "1/2"), true); // trailing zero
  assert.equal(isAnswerCorrect("-6/8", "-0.75"), true); // negative, unsimplified vs decimal
  assert.equal(isAnswerCorrect("x=-3/4", "-0.75"), true); // composes with the assignment tolerance
  assert.equal(isAnswerCorrect("2/4", "1/3"), false); // still exact, never approximate
});

test("isAnswerCorrect: three-factor products match in any permutation with the same lead", () => {
  assert.equal(isAnswerCorrect("(x+3)(x+1)(x+2)", "(x+1)(x+2)(x+3)"), true);
  assert.equal(isAnswerCorrect("3(c+1)(a+1)(b+1)", "3(a+1)(b+1)(c+1)"), true);
  assert.equal(isAnswerCorrect("3(a+1)(b+1)(c+1)", "(a+1)(b+1)(c+1)"), false); // lead must match
});

test("isAnswerCorrect: multi-root parts each get the full single-answer tolerances", () => {
  // Root values compare as rationals, so fraction and decimal roots reconcile.
  assert.equal(isAnswerCorrect("x=0.5 or x=2", "x=1/2orx=2"), true);
  assert.equal(isAnswerCorrect("0.5, 2", "x=1/2orx=2"), true); // bare values + rational tolerance
  assert.equal(isAnswerCorrect("x=0.33 or x=2", "x=1/3orx=2"), false); // approximation still rejected
});

test("isAnswerCorrect: multi-root matching requires the full solution set", () => {
  assert.equal(isAnswerCorrect("x=2", "x=2orx=3"), false); // one root of two
  assert.equal(isAnswerCorrect("x=2 or x=2", "x=2orx=3"), false); // repeated root
  assert.equal(isAnswerCorrect("x=2 or x=3 or x=4", "x=2orx=3"), false); // extra root
  assert.equal(isAnswerCorrect("x=2 or x=4", "x=2orx=3"), false); // wrong root
  assert.equal(isAnswerCorrect("x=2 or y=3", "x=2orx=3"), false); // wrong variable
});
