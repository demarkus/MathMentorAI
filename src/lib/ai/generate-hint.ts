import { normalizeAnswer } from "@/lib/math/check-answer";

/**
 * Optional AI-guided hints for practice mode.
 *
 * When a learner answers incorrectly, this asks an LLM for ONE short hint that
 * targets the specific mistake, instead of the generic seeded hint. Strictly
 * additive and best-effort by design:
 * - MARKING IS NEVER AI — `isAnswerCorrect` stays the deterministic authority;
 *   only the hint text shown after a wrong answer can come from the model.
 * - Enabled solely by the presence of ANTHROPIC_API_KEY, which is read only in
 *   this server-only module (same rule as the Supabase service-role key).
 * - Every failure path (no key, timeout, API error, over-long or answer-leaking
 *   output) returns null and the caller falls back to the seeded hint.
 * - Privacy: only the question text, the stored answer, and the learner's typed
 *   answer are sent — never names, emails, ids, or any other learner data.
 */

const ANTHROPIC_API_URL = "https://api.anthropic.com/v1/messages";
const ANTHROPIC_VERSION = "2023-06-01";
const DEFAULT_HINT_MODEL = "claude-sonnet-5";
const HINT_TIMEOUT_MS = 5000;
const HINT_MAX_TOKENS = 200;
// Inputs beyond this are not sent (answers are already capped upstream); model
// output beyond this falls back to the seeded hint rather than flooding the UI.
const MAX_INPUT_LENGTH = 400;
const MAX_HINT_LENGTH = 400;

const SYSTEM_PROMPT =
  "You are a supportive maths tutor for South African CAPS Grade 9-10 algebra. " +
  "A learner just gave a wrong answer. Reply with ONE short hint (at most two " +
  "sentences) that names the likely mistake and points to the next step of the " +
  "method. Never state or spell out the correct final answer. Plain text only; " +
  "write exponents with a caret (x^2).";

export type HintRequest = {
  questionText: string;
  expectedAnswer: string;
  learnerAnswer: string;
};

/** True when the hint effectively contains the answer it must not reveal. */
function revealsAnswer(hint: string, expectedAnswer: string): boolean {
  const compactExpected = normalizeAnswer(expectedAnswer).replace(/ /g, "");
  // Very short answers ("5") appear in almost any sentence about the working;
  // for those we rely on the prompt instead of discarding every hint.
  if (compactExpected.length < 3) return false;
  return normalizeAnswer(hint).replace(/ /g, "").includes(compactExpected);
}

/**
 * Generates a targeted hint for a wrong answer, or null when the feature is
 * off or anything at all goes wrong. `fetchImpl` is injectable for tests.
 */
export async function generateAiHint(
  request: HintRequest,
  fetchImpl: typeof fetch = fetch,
): Promise<string | null> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return null;

  const questionText = request.questionText.trim();
  const expectedAnswer = request.expectedAnswer.trim();
  const learnerAnswer = request.learnerAnswer.trim();
  if (!questionText || !expectedAnswer || !learnerAnswer) return null;
  if ([questionText, expectedAnswer, learnerAnswer].some((value) => value.length > MAX_INPUT_LENGTH)) {
    return null;
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), HINT_TIMEOUT_MS);
  try {
    const response = await fetchImpl(ANTHROPIC_API_URL, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": ANTHROPIC_VERSION,
      },
      body: JSON.stringify({
        model: process.env.AI_HINT_MODEL || DEFAULT_HINT_MODEL,
        max_tokens: HINT_MAX_TOKENS,
        system: SYSTEM_PROMPT,
        messages: [
          {
            role: "user",
            content:
              `Question: ${questionText}\n` +
              `Correct answer (do NOT reveal this): ${expectedAnswer}\n` +
              `Learner's answer: ${learnerAnswer}`,
          },
        ],
      }),
      signal: controller.signal,
    });
    if (!response.ok) return null;

    const payload = (await response.json()) as { content?: Array<{ type?: string; text?: string }> };
    const hint = payload.content?.find((block) => block.type === "text")?.text?.trim() ?? "";
    if (!hint || hint.length > MAX_HINT_LENGTH) return null;
    if (revealsAnswer(hint, expectedAnswer)) return null;
    return hint;
  } catch {
    return null; // timeout, network failure, malformed response — seeded hint wins
  } finally {
    clearTimeout(timeout);
  }
}
