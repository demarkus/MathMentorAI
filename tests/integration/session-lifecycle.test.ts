import { describe, test, expect, afterEach } from "vitest";
import {
  hasIntegrationEnv,
  createTestUser,
  learnerProfileId,
  serviceClient,
  deleteTestUsers,
  type TestUser,
} from "./helpers";

/**
 * Issue 3 regression tests: abandoned issued sessions are reclaimable and
 * submitted history is never touched. Gated on INTEGRATION_SUPABASE_* (needs the
 * add_session_expiry_and_cleanup migration applied to the test project). Runs
 * against a dedicated test project only.
 */
describe.skipIf(!hasIntegrationEnv)("issued-session lifecycle (Issue 3)", () => {
  const created: TestUser[] = [];
  afterEach(async () => {
    const svc = serviceClient();
    for (const u of created) {
      const lid = await learnerProfileId(u.id).catch(() => null);
      if (lid) await svc.from("quiz_sessions").delete().eq("learner_id", lid);
    }
    await deleteTestUsers(...created.splice(0));
  });

  async function seedSession(learnerId: string, status: string, expiresAt: string): Promise<string> {
    const svc = serviceClient();
    const { data, error } = await svc
      .from("quiz_sessions")
      .insert({ learner_id: learnerId, quiz_type: "diagnostic", status, question_ids: [], expires_at: expiresAt })
      .select("id")
      .single();
    if (error || !data) throw new Error(`seed session failed: ${error?.message}`);
    return (data as { id: string }).id;
  }

  async function sessionExists(id: string): Promise<boolean> {
    const { data } = await serviceClient().from("quiz_sessions").select("id").eq("id", id).maybeSingle();
    return Boolean(data);
  }

  test("cleanup_expired_sessions removes an expired issued session", async () => {
    const student = await createTestUser("student");
    created.push(student);
    const learnerId = await learnerProfileId(student.id);
    const past = new Date(Date.now() - 3_600_000).toISOString();

    const id = await seedSession(learnerId, "issued", past);
    expect(await sessionExists(id)).toBe(true);

    const { error } = await serviceClient().rpc("cleanup_expired_sessions");
    expect(error).toBeNull();
    expect(await sessionExists(id)).toBe(false);
  });

  test("cleanup_expired_sessions never deletes a submitted session, even if expired", async () => {
    const student = await createTestUser("student");
    created.push(student);
    const learnerId = await learnerProfileId(student.id);
    const past = new Date(Date.now() - 3_600_000).toISOString();

    const id = await seedSession(learnerId, "submitted", past);
    await serviceClient().rpc("cleanup_expired_sessions");
    expect(await sessionExists(id)).toBe(true);
  });

  test("cleanup_expired_sessions leaves a fresh issued session in place", async () => {
    const student = await createTestUser("student");
    created.push(student);
    const learnerId = await learnerProfileId(student.id);
    const future = new Date(Date.now() + 3_600_000).toISOString();

    const id = await seedSession(learnerId, "issued", future);
    await serviceClient().rpc("cleanup_expired_sessions");
    expect(await sessionExists(id)).toBe(true);
  });
});
