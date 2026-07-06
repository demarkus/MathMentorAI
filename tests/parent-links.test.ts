import { describe, test, expect, vi, beforeEach } from "vitest";

/**
 * Unit tests for the parent-learner linking Server Actions. The Supabase client
 * is mocked with a recording chain; the RLS side of the security model is
 * covered by tests/integration/rls.test.ts.
 */

const requireRole = vi.fn();
vi.mock("@/lib/auth/require-role", () => ({ requireRole: (...args: unknown[]) => requireRole(...args) }));

const revalidatePath = vi.fn();
vi.mock("next/cache", () => ({ revalidatePath: (...args: unknown[]) => revalidatePath(...args) }));

type ChainResult = { data?: unknown; error?: { code?: string; message?: string } | null };

// Recording query chain: every method returns the chain; awaiting insert() or
// select() resolves with the configured result.
function makeChain(result: ChainResult) {
  const calls: Record<string, unknown[][]> = { insert: [], delete: [], update: [], eq: [], select: [] };
  const chain = {
    calls,
    insert: vi.fn((...args: unknown[]) => {
      calls.insert.push(args);
      return Promise.resolve(result);
    }),
    delete: vi.fn((...args: unknown[]) => {
      calls.delete.push(args);
      return chain;
    }),
    update: vi.fn((...args: unknown[]) => {
      calls.update.push(args);
      return chain;
    }),
    eq: vi.fn((...args: unknown[]) => {
      calls.eq.push(args);
      return chain;
    }),
    select: vi.fn((...args: unknown[]) => {
      calls.select.push(args);
      return Promise.resolve(result);
    }),
  };
  return chain;
}

let chain: ReturnType<typeof makeChain>;
const from = vi.fn(() => chain);
vi.mock("@/lib/supabase/server", () => ({ createClient: vi.fn(async () => ({ from })) }));

import { inviteLearner, removeLearnerLink } from "@/app/parent/reports/actions";
import { respondToInvitation } from "@/app/learner/actions";

const PARENT = {
  id: "parent-1",
  email: "parent@example.com",
  profile: { id: "parent-1", email: "parent@example.com", full_name: "Pat Parent", role: "parent" },
};
const LEARNER = {
  id: "learner-1",
  email: "kid@example.com",
  profile: { id: "learner-1", email: "kid@example.com", full_name: "Kai Kid", role: "student" },
};

const LINK_ID = "2b1b6a1e-9d1f-4c1e-8a3a-3f2b7c9d0e1f";

beforeEach(() => {
  requireRole.mockReset();
  revalidatePath.mockReset();
  from.mockClear();
  chain = makeChain({ data: [{ id: LINK_ID }], error: null });
});

describe("inviteLearner", () => {
  beforeEach(() => requireRole.mockResolvedValue(PARENT));

  test("requires the parent role and inserts a normalized pending link", async () => {
    const result = await inviteLearner("  Kid@Example.COM ");
    expect(result).toEqual({ ok: true });
    expect(requireRole).toHaveBeenCalledWith("parent");
    expect(from).toHaveBeenCalledWith("parent_learner_links");
    expect(chain.insert).toHaveBeenCalledWith({ parent_id: "parent-1", learner_email: "kid@example.com" });
    expect(revalidatePath).toHaveBeenCalledWith("/parent/reports");
  });

  test("rejects an invalid email before any query", async () => {
    const result = await inviteLearner("not-an-email");
    expect(result).toEqual({ error: expect.stringContaining("valid email") });
    expect(from).not.toHaveBeenCalled();
  });

  test("rejects an oversized email before any query", async () => {
    const result = await inviteLearner(`${"x".repeat(255)}@example.com`);
    expect(result).toEqual({ error: expect.stringContaining("valid email") });
    expect(from).not.toHaveBeenCalled();
  });

  test("rejects inviting the parent's own email", async () => {
    const result = await inviteLearner("Parent@Example.com");
    expect(result).toEqual({ error: expect.stringContaining("your own email") });
    expect(from).not.toHaveBeenCalled();
  });

  test("a duplicate invitation surfaces a friendly message", async () => {
    chain = makeChain({ error: { code: "23505", message: "duplicate key value" } });
    const result = await inviteLearner("kid@example.com");
    expect(result).toEqual({ error: expect.stringContaining("already sent") });
    expect(revalidatePath).not.toHaveBeenCalled();
  });

  test("other insert errors surface generically", async () => {
    chain = makeChain({ error: { code: "42501", message: "rls" } });
    const result = await inviteLearner("kid@example.com");
    expect(result).toEqual({ error: expect.stringContaining("couldn’t send") });
    expect(revalidatePath).not.toHaveBeenCalled();
  });
});

describe("removeLearnerLink", () => {
  beforeEach(() => requireRole.mockResolvedValue(PARENT));

  test("deletes the link scoped to the signed-in parent", async () => {
    const result = await removeLearnerLink(LINK_ID);
    expect(result).toEqual({ ok: true });
    expect(requireRole).toHaveBeenCalledWith("parent");
    expect(chain.delete).toHaveBeenCalled();
    expect(chain.calls.eq).toContainEqual(["id", LINK_ID]);
    expect(chain.calls.eq).toContainEqual(["parent_id", "parent-1"]);
    expect(revalidatePath).toHaveBeenCalledWith("/parent/reports");
  });

  test("rejects a malformed link id before any query", async () => {
    const result = await removeLearnerLink("../../etc/passwd");
    expect(result).toEqual({ error: expect.stringContaining("could not be found") });
    expect(from).not.toHaveBeenCalled();
  });

  test("reports when nothing was removed (unknown or foreign link)", async () => {
    chain = makeChain({ data: [], error: null });
    const result = await removeLearnerLink(LINK_ID);
    expect(result).toEqual({ error: expect.stringContaining("could not be found") });
    expect(revalidatePath).not.toHaveBeenCalled();
  });
});

describe("respondToInvitation", () => {
  beforeEach(() => requireRole.mockResolvedValue(LEARNER));

  test("accepting binds learner_id to the signed-in learner and targets pending rows only", async () => {
    const result = await respondToInvitation(LINK_ID, true);
    expect(result).toEqual({ ok: true });
    expect(requireRole).toHaveBeenCalledWith("learner");
    expect(chain.update).toHaveBeenCalledWith({ status: "accepted", learner_id: "learner-1" });
    expect(chain.calls.eq).toContainEqual(["id", LINK_ID]);
    expect(chain.calls.eq).toContainEqual(["status", "pending"]);
    expect(revalidatePath).toHaveBeenCalledWith("/learner");
  });

  test("rejecting records the decision with the responder's id", async () => {
    const result = await respondToInvitation(LINK_ID, false);
    expect(result).toEqual({ ok: true });
    expect(chain.update).toHaveBeenCalledWith({ status: "rejected", learner_id: "learner-1" });
  });

  test("rejects a malformed invitation id before any query", async () => {
    const result = await respondToInvitation("nope", true);
    expect(result).toEqual({ error: expect.stringContaining("could not be found") });
    expect(from).not.toHaveBeenCalled();
  });

  test("an already-decided or foreign invitation is reported as unavailable", async () => {
    chain = makeChain({ data: [], error: null });
    const result = await respondToInvitation(LINK_ID, true);
    expect(result).toEqual({ error: expect.stringContaining("no longer available") });
    expect(revalidatePath).not.toHaveBeenCalled();
  });

  test("an update error surfaces generically", async () => {
    chain = makeChain({ error: { message: "boom" } });
    const result = await respondToInvitation(LINK_ID, true);
    expect(result).toEqual({ error: expect.stringContaining("couldn’t save") });
  });
});
