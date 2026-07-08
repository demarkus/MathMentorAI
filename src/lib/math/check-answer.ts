import { parse, rationalize, simplify, type MathNode } from "mathjs";

/**
 * Tolerant, non-AI answer checking for maths practice.
 *
 * Normalization steps:
 * - Unicode NFKC (so full-width / compatibility characters compare equal)
 * - trim outer whitespace
 * - lowercase
 * - map common multiplication signs (× ·) to *
 * - remove optional spaces around =, +, -, *, /, ^
 * - collapse remaining repeated whitespace to a single space
 */
const SUPERSCRIPT_DIGITS: Record<string, string> = {
  "⁰": "0", "¹": "1", "²": "2", "³": "3", "⁴": "4",
  "⁵": "5", "⁶": "6", "⁷": "7", "⁸": "8", "⁹": "9", "⁻": "-",
};

export function normalizeAnswer(input: string): string {
  return (input ?? "")
    // Unicode superscripts become caret exponents ("x²" → "x^2") BEFORE NFKC,
    // which would otherwise silently fold "x²" into the unrelated symbol "x2".
    .replace(/[⁰¹²³⁴⁵⁶⁷⁸⁹⁻]+/g, (run) => "^" + run.split("").map((char) => SUPERSCRIPT_DIGITS[char]).join(""))
    .normalize("NFKC")
    .trim()
    .toLowerCase()
    .replace(/[×·]/g, "*")
    .replace(/\s*([=+\-*/^])\s*/g, "$1")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Splits a normalized single-variable assignment ("x=5") into its variable and
 * value. Returns a null variable when the string is not an assignment, so a bare
 * value ("5") and an assignment ("x=5") can be compared on their value part.
 */
function parseAssignment(normalized: string): { variable: string | null; value: string } {
  const match = /^([a-z])=(.+)$/.exec(normalized);
  return match ? { variable: match[1], value: match[2] } : { variable: null, value: normalized };
}

/**
 * Parses a plain decimal ("0.5", "-3") into an exact integer fraction, or null
 * when the string is not a plain decimal. BigInt keeps the comparison exact for
 * any digit count (constructor form only — ES2017 target forbids literals).
 */
function decimalToFraction(value: string): { num: bigint; den: bigint } | null {
  const match = /^([+-]?)(\d+)(?:\.(\d+))?$/.exec(value);
  if (!match) return null;
  const fractionDigits = match[3] ?? "";
  const num = BigInt((match[1] === "-" ? "-" : "") + match[2] + fractionDigits);
  const den = BigInt("1" + "0".repeat(fractionDigits.length));
  return { num, den };
}

/**
 * Parses a normalized numeric value — a plain decimal or a simple fraction
 * "p/q" of plain decimals — into an exact rational, or null for anything else.
 */
function toRational(value: string): { num: bigint; den: bigint } | null {
  const parts = value.split("/");
  if (parts.length > 2) return null;
  const numerator = decimalToFraction(parts[0]);
  if (!numerator) return null;
  if (parts.length === 1) return numerator;
  const denominator = decimalToFraction(parts[1]);
  if (!denominator || denominator.num === BigInt(0)) return null;
  // p1/q1 ÷ p2/q2 = (p1·q2) / (q1·p2)
  return { num: numerator.num * denominator.den, den: numerator.den * denominator.num };
}

/** Exact fraction↔decimal equivalence: "1/2" ≡ "0.5", "-3/4" ≡ "-0.75". */
function rationalsEqual(a: string, b: string): boolean {
  const left = toRational(a);
  if (!left) return false;
  const right = toRational(b);
  if (!right) return false;
  return left.num * right.den === right.num * left.den;
}

/**
 * Parses a normalized string as a product ending in top-level bracketed
 * factors — "(x+2)(x+3)", "x(x-2)(x+2)", "2(a+1)(a+2)" — into its leading part
 * and factor list. Returns null (no reorder tolerance) unless there are at
 * least two factors to reorder, or when the leading part contains "/" or "^",
 * where reordering the brackets would change the meaning ("1/(x+2)(x+3)").
 */
function parseFactoredProduct(value: string): { lead: string; factors: string[] } | null {
  const match = /^([^()]*)((?:\([^()]+\))+)$/.exec(value);
  if (!match) return null;
  const lead = match[1];
  if (lead.includes("/") || lead.includes("^")) return null;
  const factors = match[2].match(/\([^()]+\)/g) ?? [];
  if (factors.length < 2) return null;
  return { lead, factors };
}

/**
 * Order-insensitive factor comparison: "(x+3)(x+2)" ≡ "(x+2)(x+3)", including a
 * shared leading monomial ("2(x-2)(x+2)" ≡ "2(x+2)(x-2)"). Factors themselves
 * still compare as exact normalized strings — "(x+2)" and "(2+x)" stay unequal.
 */
function factoredProductsEqual(a: string, b: string): boolean {
  const left = parseFactoredProduct(a);
  if (!left) return false;
  const right = parseFactoredProduct(b);
  if (!right) return false;
  if (left.lead !== right.lead || left.factors.length !== right.factors.length) return false;
  const sortedLeft = [...left.factors].sort();
  const sortedRight = [...right.factors].sort();
  return sortedLeft.every((factor, index) => factor === sortedRight[index]);
}

// ---------------------------------------------------------------------------
// Symbolic (same-form) equivalence
//
// A guarded mathjs fallback that bridges pure REORDERINGS within one written
// form — term order ("(2+x)" ≡ "(x+2)", "1+2x+x^2" ≡ "x^2+2x+1") and spacing
// ("2 x+1" ≡ "2x+1") — by checking that the difference of the two expressions
// simplifies to exactly zero. Two gates keep it from crediting work the learner
// hasn't done:
//   1. WRITTEN FORM must match — an expanded polynomial is not accepted for a
//      factorised answer, nor an unsimplified fraction for its simplified value
//      ("Factorise: x^2-9" must not accept the question echoed back).
//   2. TOKEN MULTISET must match — the two sides must be anagrams of each other
//      (same symbols, just reordered). A SIMPLIFICATION changes the tokens
//      ("x^3*x^4" -> "x^7", "3x+2x" -> "5x"), so echoing an unsimplified
//      expression at a "Simplify:" question is rejected even though it is
//      mathematically equal. mathjs still does the real work of confirming the
//      reordering is valid ("x+2y" vs "y+2x" are anagrams but NOT equal).
// Marking stays fully deterministic — no AI, no approximation (the difference
// must simplify to the constant 0, never "close to 0").
// ---------------------------------------------------------------------------

const SYMBOLIC_MAX_LENGTH = 80;
const SYMBOLIC_CHARSET = /^[0-9a-z+\-*/^(). ]+$/;
const SYMBOLIC_MAX_EXPONENT = 12;
const SYMBOLIC_MAX_POWERS = 4;

type ValueForm = "fraction" | "factored" | "plain";

/** The written form of a value; symbolic equivalence only applies within one. */
function valueForm(value: string): ValueForm {
  if (value.includes("/")) return "fraction";
  if (value.includes("(")) return "factored";
  return "plain";
}

/**
 * The sorted multiset of non-space characters. Two expressions that are pure
 * reorderings of each other share it ("(2+x)" / "(x+2)"); a simplification does
 * not ("x^3*x^4" vs "x^7"). Used to restrict symbolic acceptance to reorderings.
 */
function tokenSignature(value: string): string {
  return value.replace(/\s/g, "").split("").sort().join("");
}

/**
 * Makes implicit multiplication explicit before parsing: ")(", "2x", "2(",
 * "x(", and the spaces normalizeAnswer leaves between operands all become "*".
 * mathjs would otherwise give juxtaposition a HIGHER precedence than "/"
 * (reading "1/(x+3)(x+2)" as 1 over the whole product); explicit "*" restores
 * the left-to-right convention this module documents. "x2" (letter then digit)
 * is deliberately left alone — it reads as its own symbol, not x*2.
 */
function toExplicitMultiplication(value: string): string {
  return value
    .replace(/ /g, "*")
    .replace(/\)(?=[0-9a-z(])/g, ")*")
    .replace(/([0-9])(?=[a-z(])/g, "$1*")
    .replace(/([a-z])(?=\()/g, "$1*");
}

/**
 * Rejects ASTs that are unsafe or meaningless to compare: non-constant or
 * oversized exponents (a "(x+1)^99999" expansion bomb), too many powers, and
 * function calls (anything juxtaposition preprocessing didn't catch).
 */
function isSafeExpressionNode(node: MathNode): boolean {
  let powers = 0;
  let safe = true;
  node.traverse((child) => {
    const candidate = child as { type: string; op?: string; args?: Array<{ type: string; value?: unknown }> };
    if (candidate.type === "FunctionNode") safe = false;
    if (candidate.type === "OperatorNode" && candidate.op === "^") {
      powers += 1;
      const exponent = candidate.args?.[1];
      const value = exponent?.type === "ConstantNode" ? Number(exponent.value) : NaN;
      if (!Number.isInteger(value) || value < 0 || value > SYMBOLIC_MAX_EXPONENT) safe = false;
    }
  });
  return safe && powers <= SYMBOLIC_MAX_POWERS;
}

/** True when a node is 0, or a fraction with numerator 0 (zero wherever defined). */
function isZeroNode(node: { toString(): string }): boolean {
  if (node.toString() === "0") return true;
  const candidate = node as { type?: string; op?: string; args?: Array<{ toString(): string }> };
  return candidate.type === "OperatorNode" && candidate.op === "/" && candidate.args?.[0]?.toString() === "0";
}

/**
 * Same-form symbolic equality via "difference simplifies to exactly zero".
 * `rationalize` covers single-variable polynomial rewrites; `simplify` covers
 * multivariable commutativity. Any parse/size/form failure returns false — the
 * fallback can only ever ADD acceptance, never remove it.
 */
function symbolicallyEqual(a: string, b: string): boolean {
  if (a.length > SYMBOLIC_MAX_LENGTH || b.length > SYMBOLIC_MAX_LENGTH) return false;
  if (!SYMBOLIC_CHARSET.test(a) || !SYMBOLIC_CHARSET.test(b)) return false;
  if (valueForm(a) !== valueForm(b)) return false;
  // Only accept pure reorderings, never simplifications: the two sides must be
  // token anagrams. "x^3*x^4" and "x^7" differ here, so echoing an unsimplified
  // expression at a "Simplify:" question is rejected even though it is equal.
  if (tokenSignature(a) !== tokenSignature(b)) return false;
  // Numeric answers are handled exactly by rationalsEqual; symbolically
  // accepting "2+2" for "4" would credit unsimplified computations.
  if (toRational(a) || toRational(b)) return false;
  try {
    const difference = parse(`(${toExplicitMultiplication(a)})-(${toExplicitMultiplication(b)})`);
    if (!isSafeExpressionNode(difference)) return false;
    try {
      if (isZeroNode(rationalize(difference))) return true;
    } catch {
      // Not rationalizable (multivariable, non-polynomial) — try simplify.
    }
    return simplify(difference).toString() === "0";
  } catch {
    return false;
  }
}

/** Value-level equivalence: exact string, exact rational, reordered factors, or same-form symbolic. */
function valuesMatch(a: string, b: string): boolean {
  return a === b || rationalsEqual(a, b) || factoredProductsEqual(a, b) || symbolicallyEqual(a, b);
}

/**
 * Compares one normalized answer part against another, applying the "x = 5" vs
 * "5" assignment tolerance: when either side is a simple single-variable
 * assignment the value parts are compared, and when both sides name a variable
 * they must name the SAME one.
 */
function singleAnswerMatch(learner: string, expected: string): boolean {
  const learnerParts = parseAssignment(learner);
  const expectedParts = parseAssignment(expected);
  if (learnerParts.variable && expectedParts.variable && learnerParts.variable !== expectedParts.variable) {
    return false;
  }
  return valuesMatch(learnerParts.value, expectedParts.value);
}

/**
 * Splits a normalized answer into its solution parts on "or" / "," / ";"
 * separators ("x=2 or x=3", "x=2orx=3", "2, 3"). Single-part answers return a
 * one-element array. Variables here are single letters, so a bare "or" can only
 * ever be a separator, never part of an expression.
 *
 * "/" doubles as a root separator in some marking styles ("x=2 / x=3"), but it
 * is ALSO division ("1/2"). It is treated as a separator only when every piece
 * it produces is a single-variable assignment — so "x=2/x=3" splits into two
 * roots while "1/2" and "x=1/2" stay intact as fractions.
 */
function splitSolutionParts(normalized: string): string[] {
  const parts = normalized
    .split(/\s*(?:,|;|or)\s*/)
    .map((part) => part.trim())
    .filter((part) => part.length > 0);
  if (parts.length > 1) return parts;

  const slashParts = normalized.split("/").map((part) => part.trim());
  if (slashParts.length > 1 && slashParts.every((part) => parseAssignment(part).variable !== null)) {
    return slashParts;
  }
  return parts;
}

/**
 * Order-insensitive comparison of multi-root answers: "x=3 or x=2" ≡ "x=2orx=3"
 * ≡ "2, 3" (each part still passes through the single-part tolerances). Both
 * sides must contribute the same number of parts — a learner listing one root
 * of two, or repeating a root, stays incorrect.
 */
function multiRootMatch(learner: string, expected: string): boolean {
  const learnerParts = splitSolutionParts(learner);
  const expectedParts = splitSolutionParts(expected);
  if (learnerParts.length < 2 || learnerParts.length !== expectedParts.length) return false;

  const remaining = [...expectedParts];
  for (const part of learnerParts) {
    const index = remaining.findIndex((candidate) => singleAnswerMatch(part, candidate));
    if (index === -1) return false;
    remaining.splice(index, 1);
  }
  return true;
}

/**
 * Compares a learner answer against the stored answer. Empty answers are
 * permitted (the caller may allow blanks) but are always marked incorrect.
 *
 * Matching is deterministic (no AI, nothing approximate). Beyond exact match
 * after `normalizeAnswer`, the accepted equivalences are:
 * - "x = 5" ↔ "5" (single-variable assignment vs bare value; same variable
 *   required when both sides name one)
 * - multi-root sets in any order: "x=3 or x=2" ↔ "x=2orx=3" (also "," / ";",
 *   and "/" when it separates assignments — "x=2/x=3" — never inside fractions)
 * - reordered bracketed factors: "(x+3)(x+2)" ↔ "(x+2)(x+3)", "2(b+1)(a+1)" ↔
 *   "2(a+1)(b+1)" — skipped when a "/" or "^" before the brackets would make
 *   reordering change the meaning
 * - exact fraction ↔ decimal: "1/2" ↔ "0.5" (never approximate: "0.33" ≠ "1/3")
 * - unicode superscripts: "x²" ↔ "x^2"
 * - SAME-FORM symbolic rewrites (guarded mathjs, difference must simplify to
 *   exactly 0): term order "(2+x)" ↔ "(x+2)", "1+2x+x^2" ↔ "x^2+2x+1",
 *   spacing "2 x+1" ↔ "2x+1"
 *
 * Deliberate remaining limitations:
 * - CROSS-FORM equivalence is never applied: an expanded polynomial is not
 *   accepted for a factorised answer ("x^2-9" ≠ "(x-3)(x+3)") and an
 *   unsimplified fraction is not accepted for its simplified value
 *   ("6x/3" ≠ "2x"). This is pedagogy, not a parser gap — otherwise
 *   "Factorise: x^2-9" would mark the question echoed back as correct.
 * - "2x" and "x2" are NOT reconciled ("x2" reads as its own symbol).
 */
export function isAnswerCorrect(learnerAnswer: string, expectedAnswer: string): boolean {
  const learner = normalizeAnswer(learnerAnswer);
  if (!learner) return false;
  const expected = normalizeAnswer(expectedAnswer);
  if (learner === expected) return true;
  if (multiRootMatch(learner, expected)) return true;
  return singleAnswerMatch(learner, expected);
}
