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
 * Compares a learner answer against the stored answer. Empty answers are
 * permitted (the caller may allow blanks) but are always marked incorrect.
 */
export function isAnswerCorrect(learnerAnswer: string, expectedAnswer: string): boolean {
  const learner = normalizeAnswer(learnerAnswer);
  if (!learner) return false;
  return learner === normalizeAnswer(expectedAnswer);
}
