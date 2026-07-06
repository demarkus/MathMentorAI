import { normalizeAnswer } from "@/lib/math/check-answer";

/**
 * Optional AI-assisted worked solutions for practice mode.
 *
 * When a learner answers incorrectly, this asks an LLM for a short sequence of
 * worked steps that starts from the learner's specific mistake and derives the
 * stored correct answer. Same contract as generate-hint.ts:
 * - MARKING IS NEVER AI — only the explanation shown after a wrong answer can
 *   come from the model; `isAnswerCorrect` stays the deterministic authority.
 * - Enabled solely by ANTHROPIC_API_KEY (server-only, read here and in
 *   generate-hint.ts only).
 * - Every failure returns null and the caller falls back to the seeded
 *   `solution_steps`. Unlike hints, the steps are shown NEXT TO the revealed
 *   correct answer, so they must ARRIVE at it — output whose final working
 *   doesn't contain the stored answer is discarded as unreliable.
 * - Privacy: only question text, stored answer, and the learner's typed answer
 *   are sent — never learner identity.
 */

const ANTHROPIC_API_URL = "https://api.anthropic.com/v1/messages";
const ANTHROPIC_VERSION = "2023-06-01";
const DEFAULT_MODEL = "claude-sonnet-5";
const TIMEOUT_MS = 5000;
const MAX_TOKENS = 500;
const MAX_INPUT_LENGTH = 400;
const MIN_STEPS = 2;
const MAX_STEPS = 8;
const MAX_STEP_LENGTH = 200;

const SYSTEM_PROMPT =
  "You are a supportive maths tutor for South African CAPS Grade 9-10 algebra. " +
  "A learner gave a wrong answer. Write a short worked solution tailored to " +
  "their mistake: begin by naming what went wrong in their attempt, then show " +
  "the correct method step by step, ending on the correct answer. Output ONLY " +
  "the steps, one per line, no numbering, no preamble, 3 to 6 lines. Plain " +
  "text; write exponents with a caret (x^2).";

export type SolutionRequest = {
  questionText: string;
  expectedAnswer: string;
  learnerAnswer: string;
};

/** Splits model output into clean steps, stripping any numbering it added anyway. */
function parseSteps(output: string): string[] {
  return output
    .split("\n")
    .map((line) => line.replace(/^\s*(?:\d+[.)]\s*|[-•]\s*)?/, "").trim())
    .filter((line) => line.length > 0);
}

/**
 * Generates mistake-specific worked steps, or null when the feature is off or
 * anything at all goes wrong. `fetchImpl` is injectable for tests.
 */
export async function generateAiSolutionSteps(
  request: SolutionRequest,
  fetchImpl: typeof fetch = fetch,
): Promise<string[] | null> {
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
  const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const response = await fetchImpl(ANTHROPIC_API_URL, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": ANTHROPIC_VERSION,
      },
      body: JSON.stringify({
        model: process.env.AI_HINT_MODEL || DEFAULT_MODEL,
        max_tokens: MAX_TOKENS,
        system: SYSTEM_PROMPT,
        messages: [
          {
            role: "user",
            content:
              `Question: ${questionText}\n` +
              `Correct answer: ${expectedAnswer}\n` +
              `Learner's answer: ${learnerAnswer}`,
          },
        ],
      }),
      signal: controller.signal,
    });
    if (!response.ok) return null;

    const payload = (await response.json()) as { content?: Array<{ type?: string; text?: string }> };
    const text = payload.content?.find((block) => block.type === "text")?.text ?? "";
    const steps = parseSteps(text);
    if (steps.length < MIN_STEPS || steps.length > MAX_STEPS) return null;
    if (steps.some((step) => step.length > MAX_STEP_LENGTH)) return null;

    // The working must land on the stored answer (compared compactly, so
    // "x = 5" satisfies a stored "x=5"); a derivation that doesn't is unreliable.
    const compactExpected = normalizeAnswer(expectedAnswer).replace(/ /g, "");
    const compactSteps = normalizeAnswer(steps.join(" ")).replace(/ /g, "");
    if (!compactSteps.includes(compactExpected)) return null;

    return steps;
  } catch {
    return null; // timeout, network failure, malformed response — seeded steps win
  } finally {
    clearTimeout(timeout);
  }
}
