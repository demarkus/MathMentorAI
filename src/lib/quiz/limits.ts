/**
 * Shared quiz abuse/storage bounds, enforced at every layer:
 *   - the browser (input maxLength) for UX;
 *   - the Server Actions (reject before grading/persistence);
 *   - the database (a CHECK on attempts.submitted_answer as the backstop).
 */

/** Maximum length of a single submitted answer. Answers are short math expressions. */
export const MAX_ANSWER_LENGTH = 500;

/** True when an answer is within the allowed length. Non-strings are treated as empty. */
export function isAnswerWithinLimit(answer: unknown): boolean {
  return typeof answer === "string" ? answer.length <= MAX_ANSWER_LENGTH : answer == null;
}

/** True when every submitted answer is within the length bound. */
export function answersWithinLimit(answers: { answer: string }[]): boolean {
  return answers.every((entry) => isAnswerWithinLimit(entry.answer));
}

/**
 * Upper bound on simultaneously-issued (active, unexpired) sessions per learner.
 * Combined with same-type/topic/grade reuse, this stops a learner from piling up
 * unbounded issued sessions. Documented in docs/DATABASE.md.
 */
export const MAX_ACTIVE_ISSUED_SESSIONS = 10;
