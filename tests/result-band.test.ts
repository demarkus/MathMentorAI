import { test } from "vitest";
import assert from "node:assert/strict";
import { resultBand } from "../src/lib/math/result-band.ts";

test("80%+ is Strong (boundary at 80)", () => {
  assert.equal(resultBand(100).label, "Strong");
  assert.equal(resultBand(80).label, "Strong");
});

test("60-79% is Developing well (boundaries 79 and 60)", () => {
  assert.equal(resultBand(79).label, "Developing well");
  assert.equal(resultBand(60).label, "Developing well");
});

test("40-59% is Needs focused practice (boundaries 59 and 40)", () => {
  assert.equal(resultBand(59).label, "Needs focused practice");
  assert.equal(resultBand(40).label, "Needs focused practice");
});

test("below 40% is Needs support and revision (39 and 0)", () => {
  assert.equal(resultBand(39).label, "Needs support and revision");
  assert.equal(resultBand(0).label, "Needs support and revision");
});

test("every band carries a tone and a supportive message", () => {
  for (const pct of [90, 70, 50, 20]) {
    const band = resultBand(pct);
    assert.ok(band.tone.length > 0);
    assert.ok(band.message.length > 0);
    // Tone is never "failed"/"bad" language — messages stay encouraging.
    assert.doesNotMatch(band.message.toLowerCase(), /failed|bad|stupid/);
  }
});
