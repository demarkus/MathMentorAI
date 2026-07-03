/**
 * Deterministic, best-effort hint about the *form* an answer should take.
 *
 * This is intentionally conservative: it only states what can be read directly
 * from the stored question verb and answer string. It never performs algebra,
 * never invents mathematical content, and returns `null` when nothing can be
 * said safely. The note is guidance for the learner, not part of marking —
 * `check-answer.ts` remains the single source of truth for correctness.
 */

/** True when the trimmed string is a plain (optionally signed/decimal) number. */
function looksNumeric(value: string): boolean {
  return /^[+-]?\d+(\.\d+)?$/.test(value.trim());
}

/** True when the string is a single-variable assignment such as "x = 5". */
function looksLikeEquation(value: string): boolean {
  return /^\s*[a-zA-Z]\s*=\s*[^=]+$/.test(value);
}

/**
 * Returns a short learner-facing note about the expected answer form, or `null`
 * when it can't be inferred safely.
 *
 * - With an `answerText` (practice), the note is derived from the answer's shape.
 * - Without one (diagnostic, where answers are never sent to the client), it
 *   falls back to the question's leading verb (Solve / Factorise / Simplify).
 */
export function describeExpectedAnswer(questionText: string, answerText?: string): string | null {
  if (answerText && answerText.trim().length > 0) {
    if (looksLikeEquation(answerText)) return "Give an equation answer, e.g. x = 5.";
    if (looksNumeric(answerText)) return "Give a numeric answer.";
    if (/[a-zA-Z]/.test(answerText)) return "Give a simplified expression.";
    return null;
  }

  const verb = questionText.trim().toLowerCase();
  if (verb.startsWith("solve")) return "Give the value of the unknown, e.g. x = 5 or just 5.";
  if (verb.startsWith("factorise") || verb.startsWith("factorize") || verb.startsWith("factor")) {
    return "Give your answer in factorised form, e.g. (x + 2)(x + 3).";
  }
  if (verb.startsWith("simplify")) return "Give a simplified expression.";
  return null;
}
