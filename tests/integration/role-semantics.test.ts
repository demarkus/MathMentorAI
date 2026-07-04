import { describe, test, expect, afterEach } from "vitest";
import {
  hasIntegrationEnv,
  createTestUser,
  signInAs,
  serviceClient,
  setProfileRole,
  deleteTestUsers,
  hasLearnerProfile,
  type AppRole,
  type TestUser,
} from "./helpers";

/**
 * Issue 4 regression tests: RLS permissions reflect the role model, not just
 * ownership. Gated on INTEGRATION_SUPABASE_* (needs the
 * tighten_rls_role_semantics migration applied to the test project). Runs
 * against a dedicated test project only.
 */
describe.skipIf(!hasIntegrationEnv)("RLS role semantics (Issue 4)", () => {
  const created: TestUser[] = [];
  async function makeUser(role: AppRole | null): Promise<TestUser> {
    const user = await createTestUser(role);
    created.push(user);
    return user;
  }
  afterEach(async () => {
    await deleteTestUsers(...created.splice(0));
  });

  // ---- learner_profiles: only a student may create their own learner row ----

  test("a teacher cannot create a learner_profiles row for themselves", async () => {
    const teacher = await makeUser("teacher");
    const client = await signInAs(teacher);

    const res = await client.from("learner_profiles").insert({ user_id: teacher.id, grade: 9 });
    expect(res.error).not.toBeNull(); // RLS with_check denies (role != student)
    expect(await hasLearnerProfile(teacher.id)).toBe(false);
  });

  test("a parent cannot create a learner_profiles row for themselves", async () => {
    const parent = await makeUser("parent");
    const client = await signInAs(parent);

    const res = await client.from("learner_profiles").insert({ user_id: parent.id, grade: 10 });
    expect(res.error).not.toBeNull();
    expect(await hasLearnerProfile(parent.id)).toBe(false);
  });

  test("a student may create their own learner_profiles row", async () => {
    // Start from an unroled user with no learner row, then mark them a student.
    const user = await makeUser(null);
    await setProfileRole(user.id, "student");
    const client = await signInAs(user);

    const res = await client.from("learner_profiles").insert({ user_id: user.id, grade: 9 });
    expect(res.error).toBeNull();
    expect(await hasLearnerProfile(user.id)).toBe(true);
  });

  // ---- teacher_resources: only a teacher may create resources they own ----

  async function insertResourceAs(client: Awaited<ReturnType<typeof signInAs>>, ownerId: string) {
    return client.from("teacher_resources").insert({
      teacher_id: ownerId,
      title: "IT resource",
      grade: 9,
      resource_type: "worksheet",
      content: {},
    });
  }

  test("a student cannot create a teacher_resources row", async () => {
    const student = await makeUser("student");
    const client = await signInAs(student);

    const res = await insertResourceAs(client, student.id);
    expect(res.error).not.toBeNull(); // RLS with_check denies (role != teacher)
  });

  test("a parent cannot create a teacher_resources row", async () => {
    const parent = await makeUser("parent");
    const client = await signInAs(parent);

    const res = await insertResourceAs(client, parent.id);
    expect(res.error).not.toBeNull();
  });

  test("a teacher may create a teacher_resources row they own", async () => {
    const teacher = await makeUser("teacher");
    const client = await signInAs(teacher);

    const res = await insertResourceAs(client, teacher.id);
    expect(res.error).toBeNull();

    // Clean up the row (deleting the user cascades, but be explicit).
    await serviceClient().from("teacher_resources").delete().eq("teacher_id", teacher.id);
  });
});
