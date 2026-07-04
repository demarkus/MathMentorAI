import { test, expect, vi, beforeEach } from "vitest";

const rpc = vi.fn();
// The action now writes via the service-role client (the RPC is service-role-only).
vi.mock("@/lib/supabase/server", () => ({
  createServiceRoleClient: vi.fn(() => ({ rpc })),
}));
vi.mock("next/headers", () => ({
  headers: vi.fn(async () => new Map([["x-forwarded-for", "203.0.113.5, 10.0.0.1"]])),
}));

import { submitBetaLead, type BetaLeadInput } from "@/app/beta/actions";

function input(over: Partial<BetaLeadInput> = {}): BetaLeadInput {
  return {
    full_name: "Ada Lovelace",
    email: "Ada@Example.com",
    phone: "",
    role: "parent",
    selected_plan: "parent-beta",
    message: "",
    ...over,
  };
}

beforeEach(() => {
  rpc.mockReset();
  rpc.mockResolvedValue({ data: "ok", error: null });
});

test("valid submission calls the trusted RPC with a normalized email + first IP", async () => {
  const result = await submitBetaLead(input());
  expect(result).toEqual({ ok: true });
  expect(rpc).toHaveBeenCalledWith(
    "submit_beta_lead",
    expect.objectContaining({ p_email: "ada@example.com", p_selected_plan: "parent-beta", p_ip: "203.0.113.5" }),
  );
});

test("an unknown plan id is rejected before any RPC", async () => {
  const result = await submitBetaLead(input({ selected_plan: "free-forever" }));
  expect(result).toEqual({ error: expect.stringContaining("valid plan") });
  expect(rpc).not.toHaveBeenCalled();
});

test("an invalid email is rejected before any RPC", async () => {
  const result = await submitBetaLead(input({ email: "not-an-email" }));
  expect(result).toEqual({ error: expect.stringContaining("valid email") });
  expect(rpc).not.toHaveBeenCalled();
});

test("an oversized name is rejected before any RPC", async () => {
  const result = await submitBetaLead(input({ full_name: "x".repeat(200) }));
  expect(result).toEqual({ error: expect.stringContaining("shorten your name") });
  expect(rpc).not.toHaveBeenCalled();
});

test("an oversized message is rejected before any RPC", async () => {
  const result = await submitBetaLead(input({ message: "x".repeat(2001) }));
  expect(result).toEqual({ error: expect.stringContaining("shorten your message") });
  expect(rpc).not.toHaveBeenCalled();
});

test("a non-beta role is rejected", async () => {
  const result = await submitBetaLead(input({ role: "admin" }));
  expect(result).toEqual({ error: expect.stringContaining("who you are") });
  expect(rpc).not.toHaveBeenCalled();
});

test("a rate_limited status surfaces a friendly throttle message", async () => {
  rpc.mockResolvedValue({ data: "rate_limited", error: null });
  const result = await submitBetaLead(input());
  expect(result).toEqual({ error: expect.stringContaining("try again") });
});

test("a duplicate status is presented as success (idempotent)", async () => {
  rpc.mockResolvedValue({ data: "duplicate", error: null });
  const result = await submitBetaLead(input());
  expect(result).toEqual({ ok: true });
});

test("an RPC error is surfaced generically", async () => {
  rpc.mockResolvedValue({ data: null, error: { message: "boom" } });
  const result = await submitBetaLead(input());
  expect(result).toEqual({ error: expect.stringContaining("couldn’t submit") });
});

test("a DB invalid_plan status surfaces the plan error", async () => {
  rpc.mockResolvedValue({ data: "invalid_plan", error: null });
  const result = await submitBetaLead(input());
  expect(result).toEqual({ error: expect.stringContaining("valid plan") });
});
