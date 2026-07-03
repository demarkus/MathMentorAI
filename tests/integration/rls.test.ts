import { describe, test, expect, beforeAll, afterAll } from "vitest";
import {
  hasIntegrationEnv,
  serviceClient,
  anonClient,
  signInAs,
  createTestUser,
  learnerProfileId,
  deleteTestUsers,
  type TestUser,
} from "./helpers";

/**
 * RLS boundary checks against a live test Supabase project. Skipped unless the
 * INTEGRATION_SUPABASE_* env vars are set (see helpers.ts). These assert the
 * security model the unit suite can't reach: owner-scoping, admin visibility,
 * and the public-insert / no-public-read shape of beta_leads.
 */
describe.skipIf(!hasIntegrationEnv)("RLS boundaries", () => {
  let learnerA: TestUser;
  let learnerB: TestUser;
  let teacherA: TestUser;
  let teacherB: TestUser;
  let admin: TestUser;

  beforeAll(async () => {
    [learnerA, learnerB, teacherA, teacherB, admin] = await Promise.all([
      createTestUser("student", { grade: 9 }),
      createTestUser("student", { grade: 10 }),
      createTestUser("teacher"),
      createTestUser("teacher"),
      createTestUser("admin"),
    ]);
  });

  afterAll(async () => {
    await deleteTestUsers(learnerA, learnerB, teacherA, teacherB, admin);
  });

  describe("profiles", () => {
    test("a user reads only their own profile", async () => {
      const a = await signInAs(learnerA);
      const own = await a.from("profiles").select("id").eq("id", learnerA.id);
      expect(own.error).toBeNull();
      expect(own.data).toEqual([{ id: learnerA.id }]);

      const other = await a.from("profiles").select("id").eq("id", learnerB.id);
      expect(other.error).toBeNull();
      expect(other.data).toEqual([]); // cannot see another user's profile
    });
  });

  describe("learner_profiles", () => {
    test("a learner sees only their own learner profile", async () => {
      const a = await signInAs(learnerA);
      const rows = await a.from("learner_profiles").select("user_id");
      expect(rows.error).toBeNull();
      expect(rows.data).toEqual([{ user_id: learnerA.id }]);

      const other = await a.from("learner_profiles").select("id").eq("user_id", learnerB.id);
      expect(other.data).toEqual([]);
    });
  });

  describe("quiz_sessions (learner data)", () => {
    test("a learner cannot read another learner's sessions", async () => {
      const svc = serviceClient();
      const lpA = await learnerProfileId(learnerA.id);
      const inserted = await svc
        .from("quiz_sessions")
        .insert({ learner_id: lpA, quiz_type: "practice", score: 5, total_marks: 10, percentage: 50 })
        .select("id")
        .single();
      expect(inserted.error).toBeNull();
      const sessionId = (inserted.data as { id: string }).id;

      const a = await signInAs(learnerA);
      const ownSees = await a.from("quiz_sessions").select("id").eq("id", sessionId);
      expect(ownSees.data).toEqual([{ id: sessionId }]);

      const b = await signInAs(learnerB);
      const bSees = await b.from("quiz_sessions").select("id").eq("id", sessionId);
      expect(bSees.data).toEqual([]); // owner-scoped
    });
  });

  describe("teacher_resources", () => {
    test("owner-only visibility, with admin able to read all", async () => {
      const svc = serviceClient();
      const inserted = await svc
        .from("teacher_resources")
        .insert({
          teacher_id: teacherA.id,
          title: "IT worksheet",
          grade: 9,
          topic_id: null,
          resource_type: "worksheet",
          content: { title: "IT worksheet", grade: 9, questions: [] },
        })
        .select("id")
        .single();
      expect(inserted.error).toBeNull();
      const id = (inserted.data as { id: string }).id;

      const owner = await signInAs(teacherA);
      expect((await owner.from("teacher_resources").select("id").eq("id", id)).data).toEqual([{ id }]);

      const otherTeacher = await signInAs(teacherB);
      expect((await otherTeacher.from("teacher_resources").select("id").eq("id", id)).data).toEqual([]);

      const adminClient = await signInAs(admin);
      expect((await adminClient.from("teacher_resources").select("id").eq("id", id)).data).toEqual([{ id }]);
    });
  });

  describe("beta_leads", () => {
    test("public can insert, but only admins can read", async () => {
      const anon = anonClient();
      const email = `it-lead-${Date.now()}@mathmentor.test`;
      const insert = await anon
        .from("beta_leads")
        .insert({ full_name: "IT Lead", email, phone: null, role: "parent", selected_plan: "parent-beta", message: null });
      expect(insert.error).toBeNull(); // public insert allowed

      const anonRead = await anon.from("beta_leads").select("id");
      expect(anonRead.data).toEqual([]); // no public select

      const learner = await signInAs(learnerA);
      expect((await learner.from("beta_leads").select("id")).data).toEqual([]); // non-admin cannot read

      const adminClient = await signInAs(admin);
      const adminRead = await adminClient.from("beta_leads").select("id").eq("email", email);
      expect(adminRead.error).toBeNull();
      expect(adminRead.data?.length).toBeGreaterThanOrEqual(1); // admin can read
    });
  });
});
