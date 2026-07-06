import { test, beforeEach, afterEach } from "vitest";
import assert from "node:assert/strict";
import { generateAiSolutionSteps, type SolutionRequest } from "../src/lib/ai/generate-solution.ts";

const REQUEST: SolutionRequest = {
  questionText: "Solve: 3x + 4 = 19",
  expectedAnswer: "x=5",
  learnerAnswer: "x=7",
};

function okResponse(text: string): typeof fetch {
  return (async () => ({
    ok: true,
    json: async () => ({ content: [{ type: "text", text }] }),
  })) as unknown as typeof fetch;
}

const GOOD_OUTPUT =
  "You added 4 instead of subtracting it when isolating the x term.\n" +
  "Subtract 4 from both sides: 3x = 15.\n" +
  "Divide both sides by 3: x = 5.";

const savedKey = process.env.ANTHROPIC_API_KEY;

beforeEach(() => {
  process.env.ANTHROPIC_API_KEY = "test-key";
});

afterEach(() => {
  if (savedKey === undefined) delete process.env.ANTHROPIC_API_KEY;
  else process.env.ANTHROPIC_API_KEY = savedKey;
});

test("generateAiSolutionSteps: disabled (null) without an API key — never calls out", async () => {
  delete process.env.ANTHROPIC_API_KEY;
  let called = false;
  const spy = (async () => {
    called = true;
    throw new Error("must not be called");
  }) as unknown as typeof fetch;
  assert.equal(await generateAiSolutionSteps(REQUEST, spy), null);
  assert.equal(called, false);
});

test("generateAiSolutionSteps: parses line-per-step output and strips stray numbering", async () => {
  const steps = await generateAiSolutionSteps(REQUEST, okResponse(GOOD_OUTPUT));
  assert.deepEqual(steps, [
    "You added 4 instead of subtracting it when isolating the x term.",
    "Subtract 4 from both sides: 3x = 15.",
    "Divide both sides by 3: x = 5.",
  ]);

  const numbered = "1. Subtract 4 from both sides: 3x = 15.\n2) Divide by 3: x = 5.";
  assert.deepEqual(await generateAiSolutionSteps(REQUEST, okResponse(numbered)), [
    "Subtract 4 from both sides: 3x = 15.",
    "Divide by 3: x = 5.",
  ]);
});

test("generateAiSolutionSteps: a derivation that never reaches the stored answer is discarded", async () => {
  const wrongEnd = "Subtract 4 from both sides: 3x = 15.\nDivide both sides by 3: x = 6.";
  assert.equal(await generateAiSolutionSteps(REQUEST, okResponse(wrongEnd)), null);
});

test("generateAiSolutionSteps: API/network failures and malformed output → null (seeded steps win)", async () => {
  const apiError = (async () => ({ ok: false, json: async () => ({}) })) as unknown as typeof fetch;
  assert.equal(await generateAiSolutionSteps(REQUEST, apiError), null);

  const network = (async () => {
    throw new Error("boom");
  }) as unknown as typeof fetch;
  assert.equal(await generateAiSolutionSteps(REQUEST, network), null);

  assert.equal(await generateAiSolutionSteps(REQUEST, okResponse("")), null);
  assert.equal(await generateAiSolutionSteps(REQUEST, okResponse("x = 5")), null); // one line — too thin to trust
  const tooMany = Array.from({ length: 12 }, (_, i) => `Step ${i}: x = 5`).join("\n");
  assert.equal(await generateAiSolutionSteps(REQUEST, okResponse(tooMany)), null);
});

test("generateAiSolutionSteps: oversized inputs are never sent", async () => {
  let called = false;
  const spy = (async () => {
    called = true;
    return { ok: true, json: async () => ({ content: [{ type: "text", text: GOOD_OUTPUT }] }) };
  }) as unknown as typeof fetch;
  assert.equal(await generateAiSolutionSteps({ ...REQUEST, learnerAnswer: "x".repeat(500) }, spy), null);
  assert.equal(called, false);
});
