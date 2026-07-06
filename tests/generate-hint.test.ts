import { test, beforeEach, afterEach } from "vitest";
import assert from "node:assert/strict";
import { generateAiHint, type HintRequest } from "../src/lib/ai/generate-hint.ts";

const REQUEST: HintRequest = {
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

const savedKey = process.env.ANTHROPIC_API_KEY;

beforeEach(() => {
  process.env.ANTHROPIC_API_KEY = "test-key";
});

afterEach(() => {
  if (savedKey === undefined) delete process.env.ANTHROPIC_API_KEY;
  else process.env.ANTHROPIC_API_KEY = savedKey;
});

test("generateAiHint: disabled (null) without an API key — never calls out", async () => {
  delete process.env.ANTHROPIC_API_KEY;
  let called = false;
  const spy = (async () => {
    called = true;
    throw new Error("must not be called");
  }) as unknown as typeof fetch;
  assert.equal(await generateAiHint(REQUEST, spy), null);
  assert.equal(called, false);
});

test("generateAiHint: returns the model's hint and sends key + payload correctly", async () => {
  let captured: { url?: string; headers?: Record<string, string>; body?: string } = {};
  const spy = (async (url: string, init: { headers: Record<string, string>; body: string }) => {
    captured = { url, headers: init.headers, body: init.body };
    return { ok: true, json: async () => ({ content: [{ type: "text", text: "Check how you moved the 4 across." }] }) };
  }) as unknown as typeof fetch;

  const hint = await generateAiHint(REQUEST, spy);
  assert.equal(hint, "Check how you moved the 4 across.");
  assert.equal(captured.url, "https://api.anthropic.com/v1/messages");
  assert.equal(captured.headers?.["x-api-key"], "test-key");
  const body = JSON.parse(captured.body ?? "{}");
  assert.ok(body.model.length > 0);
  assert.match(body.messages[0].content, /Solve: 3x \+ 4 = 19/);
  assert.match(body.messages[0].content, /Learner's answer: x=7/);
});

test("generateAiHint: API error, network failure, or empty output → null (seeded hint wins)", async () => {
  const apiError = (async () => ({ ok: false, json: async () => ({}) })) as unknown as typeof fetch;
  assert.equal(await generateAiHint(REQUEST, apiError), null);

  const network = (async () => {
    throw new Error("boom");
  }) as unknown as typeof fetch;
  assert.equal(await generateAiHint(REQUEST, network), null);

  assert.equal(await generateAiHint(REQUEST, okResponse("")), null);
});

test("generateAiHint: a hint that reveals the answer is discarded", async () => {
  const leaky = okResponse("Move the 4 across and you get x = 5.");
  assert.equal(await generateAiHint(REQUEST, leaky), null);
  // The compact form leaks too ("x=5" inside "x=5orx=6"-style phrasing).
  const leakyCompact = okResponse("So the answer is x=5, well almost!");
  assert.equal(await generateAiHint(REQUEST, leakyCompact), null);
  // A hint about the METHOD that merely mentions a number is kept.
  const fine = okResponse("Subtract 4 from both sides first, then divide.");
  assert.equal(await generateAiHint(REQUEST, fine), "Subtract 4 from both sides first, then divide.");
});

test("generateAiHint: oversized inputs are not sent; oversized outputs are discarded", async () => {
  let called = false;
  const spy = (async () => {
    called = true;
    return { ok: true, json: async () => ({ content: [{ type: "text", text: "hint" }] }) };
  }) as unknown as typeof fetch;
  const huge = { ...REQUEST, learnerAnswer: "x".repeat(500) };
  assert.equal(await generateAiHint(huge, spy), null);
  assert.equal(called, false);

  assert.equal(await generateAiHint(REQUEST, okResponse("y".repeat(500))), null);
});
