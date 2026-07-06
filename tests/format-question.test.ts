import { test } from "vitest";
import assert from "node:assert/strict";
import { isValidElement, type ReactElement } from "react";
import { formatQuestion } from "../src/lib/math/format-question.ts";

/**
 * Flattens the ReactNode result back to a readable string: sup elements as
 * <sup>…</sup>, fractions as <frac>num|den</frac>, roots as <sqrt>…</sqrt>.
 */
function flatten(result: unknown): string {
  if (typeof result === "string") return result;
  assert.ok(Array.isArray(result), "expected a string or an array of nodes");
  return result
    .map((node) => {
      if (typeof node === "string") return node;
      assert.ok(isValidElement(node), "expected a string or a React element");
      const element = node as ReactElement<{ children?: unknown; "aria-label"?: string }>;
      if (element.type === "sup") return `<sup>${element.props.children}</sup>`;
      assert.equal(element.type, "span");
      const label = element.props["aria-label"] ?? "";
      const children = element.props.children as Array<ReactElement<{ children?: unknown }>>;
      if (label.startsWith("the square root of")) {
        return `<sqrt>${flatten([children[1].props.children].flat())}</sqrt>`;
      }
      assert.match(label, / over /, "span must be a fraction or a root");
      return `<frac>${children[0].props.children}|${children[1].props.children}</frac>`;
    })
    .join("");
}

test("formatQuestion: plain text without recognised math passes through as the same string", () => {
  assert.equal(formatQuestion("Solve: 3x + 4 = 19"), "Solve: 3x + 4 = 19");
});

test("formatQuestion: caret exponents become sup elements", () => {
  assert.equal(flatten(formatQuestion("Factorise: x^2 - 9")), "Factorise: x<sup>2</sup> - 9");
  assert.equal(flatten(formatQuestion("x^2+3x")), "x<sup>2</sup>+3x");
});

test("formatQuestion: multiple, negative, and letter exponents", () => {
  assert.equal(flatten(formatQuestion("x^3 * x^4 = x^7")), "x<sup>3</sup> * x<sup>4</sup> = x<sup>7</sup>");
  assert.equal(flatten(formatQuestion("Evaluate: 2^-3")), "Evaluate: 2<sup>-3</sup>");
  assert.equal(flatten(formatQuestion("x^n * x^m")), "x<sup>n</sup> * x<sup>m</sup>");
  assert.equal(flatten(formatQuestion("a^12")), "a<sup>12</sup>");
});

test("formatQuestion: an exponent at the end of the string keeps no trailing text", () => {
  assert.equal(flatten(formatQuestion("Simplify: (m^2)^3")), "Simplify: (m<sup>2</sup>)<sup>3</sup>");
});

test("formatQuestion: simple tight fractions render stacked", () => {
  assert.equal(flatten(formatQuestion("What is 1/2 + 1/4?")), "What is <frac>1|2</frac> + <frac>1|4</frac>?");
  assert.equal(flatten(formatQuestion("Simplify: 2/x + 3/x")), "Simplify: <frac>2|x</frac> + <frac>3|x</frac>");
  assert.equal(flatten(formatQuestion("Simplify: 6x/3")), "Simplify: <frac>6x|3</frac>");
  assert.equal(flatten(formatQuestion("Answer: 5/x.")), "Answer: <frac>5|x</frac>."); // sentence-final period stays
  assert.equal(flatten(formatQuestion("x = 1/8")), "x = <frac>1|8</frac>");
});

test("formatQuestion: ambiguous slashes are left as text", () => {
  assert.equal(formatQuestion("x=2/x=3"), "x=2/x=3"); // root list, not a fraction
  assert.equal(formatQuestion("0.5/2"), "0.5/2"); // decimal fragment on the left
  assert.equal(formatQuestion("3/2.5"), "3/2.5"); // decimal fragment on the right
  assert.equal(formatQuestion("(x - 9)/(x - 3)"), "(x - 9)/(x - 3)"); // compound — stays text
  assert.equal(flatten(formatQuestion("x^2/3")), "x<sup>2</sup>/3"); // exponent wins; no fraction guess
});

test("formatQuestion: square roots render with an overlined radicand", () => {
  assert.equal(flatten(formatQuestion("Evaluate: √16")), "Evaluate: <sqrt>16</sqrt>");
  assert.equal(flatten(formatQuestion("Simplify: √(x+2)")), "Simplify: <sqrt>x+2</sqrt>");
  assert.equal(flatten(formatQuestion("√(x^2+9)")), "<sqrt>x<sup>2</sup>+9</sqrt>"); // exponents format inside
  assert.equal(formatQuestion("√ 16"), "√ 16"); // spaced — left alone
});

test("formatQuestion: unicode superscripts are left untouched", () => {
  assert.equal(formatQuestion("Factorise: x² - 9"), "Factorise: x² - 9");
});

test("formatQuestion: an unrecognised caret is left as-is, not guessed at", () => {
  assert.equal(formatQuestion("x^ 2"), "x^ 2"); // space after the caret
  assert.equal(formatQuestion("x^(a+b)"), "x^(a+b)"); // compound exponent
  assert.equal(formatQuestion("trailing caret^"), "trailing caret^");
});

test("formatQuestion: nothing is evaluated and no HTML is parsed", () => {
  // Markup stays literal text — the only elements produced are our own nodes.
  assert.equal(formatQuestion("<b>2+2</b>"), "<b>2+2</b>");
  assert.equal(flatten(formatQuestion("<i>x^2</i>")), "<i>x<sup>2</sup></i>");
});

test("formatQuestion: non-string input falls back safely", () => {
  assert.equal(formatQuestion(undefined as unknown as string), "");
  assert.equal(formatQuestion(null as unknown as string), "");
});
