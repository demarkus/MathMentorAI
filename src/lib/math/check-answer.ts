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
export function normalizeAnswer(input: string): string {
  return (input ?? "")
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
 * Compares a learner answer against the stored answer. Empty answers are
 * permitted (the caller may allow blanks) but are always marked incorrect.
 *
 * Matching is deterministic and string-based (see `normalizeAnswer`). The only
 * added tolerance is a *limited* equivalence between "x = 5" and "5": if either
 * side is a simple single-variable assignment, we compare the value parts. When
 * both sides name a variable they must name the SAME one.
 *
 * Deliberate limitations (no symbolic algebra):
 * - "(x+2)(x+3)" and "(x+3)(x+2)" are NOT treated as equal (factor order).
 * - "2x" and "x2", or "1/2" and "0.5", are NOT reconciled.
 * - Equivalent-but-differently-written expressions may be marked incorrect.
 */
export function isAnswerCorrect(learnerAnswer: string, expectedAnswer: string): boolean {
  const learner = normalizeAnswer(learnerAnswer);
  if (!learner) return false;
  const expected = normalizeAnswer(expectedAnswer);
  if (learner === expected) return true;

  const learnerParts = parseAssignment(learner);
  const expectedParts = parseAssignment(expected);
  // Only apply the "x = 5" vs "5" tolerance when at least one side is an assignment.
  if (learnerParts.variable === null && expectedParts.variable === null) return false;
  // If both sides name a variable, it must be the same variable.
  if (learnerParts.variable && expectedParts.variable && learnerParts.variable !== expectedParts.variable) {
    return false;
  }
  return learnerParts.value === expectedParts.value;
}
