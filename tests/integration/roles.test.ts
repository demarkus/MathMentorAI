import { describe, test, expect, afterEach } from "vitest";
import {
  hasIntegrationEnv,
  createTestUser,
  signInAs,
  getProfileRole,
  hasLearnerProfile,
  deleteTestUsers,
  type AppRole,
  type TestUser,
} from "./helpers";

/**
 * Phase A regression tests: role assignment cannot be tampered with. Gated on
 * INTEGRATION_SUPABASE_* (needs the secure_roles migration applied to the test
 * project). Runs against a dedicated test project only.
 */
describe.skipIf(!hasIntegrationEnv)("secure roles (Phase A)", () => {
  const created: TestUser[] = [];
  async function makeUser(role: AppRole | null, opts?: { grade?: number }): Promise<TestUser> {
    const user = await createTestUser(role, opts);
    created.push(user);
    return user;
  }
  afterEach(async () => {
    await deleteTestUsers(...created.splice(0));
  });

  test("an authenticated user cannot change their own role to admin via the Data API", async () => {
    const user = await makeUser("student", { grade: 9 });
    const client = await signInAs(user);

    const res = await client.from("profiles").update({ role: "admin" }).eq("id", user.id);
    expect(res.error).not.toBeNull(); // permission denied for column role
    expect(await getProfileRole(user.id)).toBe("student"); // unchanged
  });

  test("complete_onboarding rejects admin and unknown roles", async () => {
    const user = await makeUser(null);
    const client = await signInAs(user);

    expect((await client.rpc("complete_onboarding", { p_role: "admin", p_grade: null })).error).not.toBeNull();
    expect((await client.rpc("complete_onboarding", { p_role: "wizard", p_grade: null })).error).not.toBeNull();
    expect(await getProfileRole(user.id)).toBeNull(); // role never set
  });

  test("complete_onboarding sets a learner role + grade atomically when unset", async () => {
    const user = await makeUser(null);
    const client = await signInAs(user);

    const res = await client.rpc("complete_onboarding", { p_role: "student", p_grade: 9 });
    expect(res.error).toBeNull();
    expect(await getProfileRole(user.id)).toBe("student");
    expect(await hasLearnerProfile(user.id)).toBe(true);
  });

  test("complete_onboarding refuses to change a role that is already set", async () => {
    const user = await makeUser("student", { grade: 9 });
    const client = await signInAs(user);

    const res = await client.rpc("complete_onboarding", { p_role: "teacher", p_grade: null });
    expect(res.error).not.toBeNull(); // 'role already set'
    expect(await getProfileRole(user.id)).toBe("student");
  });

  test("complete_onboarding rejects an invalid student grade with no partial write", async () => {
    const user = await makeUser(null);
    const client = await signInAs(user);

    const res = await client.rpc("complete_onboarding", { p_role: "student", p_grade: 7 });
    expect(res.error).not.toBeNull();
    expect(await getProfileRole(user.id)).toBeNull(); // role not set
    expect(await hasLearnerProfile(user.id)).toBe(false); // and no learner profile
  });
});
