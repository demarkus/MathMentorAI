import { test } from "node:test";
import assert from "node:assert/strict";
import { PLANS, BETA_ROLES, isPlanId, isBetaRole, planName } from "../src/lib/marketing/plans.ts";

test("isPlanId: accepts real plan ids, rejects the rest", () => {
  assert.equal(isPlanId("parent-beta"), true);
  assert.equal(isPlanId("learner-monthly"), true);
  assert.equal(isPlanId("not-a-plan"), false);
  assert.equal(isPlanId(undefined), false);
});

test("isBetaRole: only the five public beta roles are valid (no admin)", () => {
  for (const role of BETA_ROLES) {
    assert.equal(isBetaRole(role.value), true);
  }
  assert.equal(isBetaRole("admin"), false);
  assert.equal(isBetaRole("student"), false);
});

test("planName: resolves a known id, echoes back an unknown one", () => {
  assert.equal(planName("parent-beta"), "Parent Beta");
  assert.equal(planName("mystery"), "mystery");
});

test("every plan exposes the fields the pricing/beta UI reads", () => {
  for (const plan of PLANS) {
    assert.ok(plan.id && plan.name && plan.price && plan.cadence);
    assert.ok(plan.description.length > 0);
    assert.ok(Array.isArray(plan.features) && plan.features.length > 0);
  }
});
