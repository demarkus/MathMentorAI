import { describe, test, expect, beforeAll, afterAll } from "vitest";
import {
  hasIntegrationEnv,
  serviceClient,
  anonClient,
  signInAs,
  createTestUser,
  learnerProfileId,
  createFixtureTopic,
  createFixtureQuestion,
  deleteFixtureTopic,
  deleteTestUsers,
  type TestUser,
} from "./helpers";

/**
 * RLS boundary checks against a live test Supabase project. Skipped unless the
 * INTEGRATION_SUPABASE_* env vars are set (see helpers.ts). These assert the
 * security model the unit suite can't reach: owner-scoping, admin visibility,
 * public content read, and the write-via-function / no-public-read shape of beta_leads.
 */
describe.skipIf(!hasIntegrationEnv)("RLS boundaries", () => {
  let learnerA: TestUser;
  let learnerB: TestUser;
  let teacherA: TestUser;
  let teacherB: TestUser;
  let admin: TestUser;

  let fixtureTopicId: string | undefined;
  let activeQuestionId: string;
  let inactiveQuestionId: string;

  beforeAll(async () => {
    [learnerA, learnerB, teacherA, teacherB, admin] = await Promise.all([
      createTestUser("student", { grade: 9 }),
      createTestUser("student", { grade: 10 }),
      createTestUser("teacher"),
      createTestUser("teacher"),
      createTestUser("admin"),
    ]);

    const topic = await createFixtureTopic();
    fixtureTopicId = topic.id;
    const [active, inactive] = await Promise.all([
      createFixtureQuestion(topic.id, true),
      createFixtureQuestion(topic.id, false),
    ]);
    activeQuestionId = active.id;
    inactiveQuestionId = inactive.id;
  });

  afterAll(async () => {
    await deleteFixtureTopic(fixtureTopicId); // cascades to fixture questions/attempts
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
      expect((await a.from("quiz_sessions").select("id").eq("id", sessionId)).data).toEqual([{ id: sessionId }]);

      const b = await signInAs(learnerB);
      expect((await b.from("quiz_sessions").select("id").eq("id", sessionId)).data).toEqual([]); // owner-scoped
    });
  });

  describe("attempts (learner data)", () => {
    test("a learner cannot read another learner's attempts", async () => {
      const svc = serviceClient();
      const lpA = await learnerProfileId(learnerA.id);
      const inserted = await svc
        .from("attempts")
        .insert({ learner_id: lpA, question_id: activeQuestionId, submitted_answer: "2", is_correct: true, score: 1 })
        .select("id")
        .single();
      expect(inserted.error).toBeNull();
      const attemptId = (inserted.data as { id: string }).id;

      const a = await signInAs(learnerA);
      expect((await a.from("attempts").select("id").eq("id", attemptId)).data).toEqual([{ id: attemptId }]);

      const b = await signInAs(learnerB);
      expect((await b.from("attempts").select("id").eq("id", attemptId)).data).toEqual([]); // owner-scoped
    });
  });

  describe("reports (learner data)", () => {
    test("a learner cannot read another learner's reports", async () => {
      const svc = serviceClient();
      const lpA = await learnerProfileId(learnerA.id);
      const inserted = await svc
        .from("reports")
        .insert({ learner_id: lpA, report_type: "practice", data: {} })
        .select("id")
        .single();
      expect(inserted.error).toBeNull();
      const reportId = (inserted.data as { id: string }).id;

      const a = await signInAs(learnerA);
      expect((await a.from("reports").select("id").eq("id", reportId)).data).toEqual([{ id: reportId }]);

      const b = await signInAs(learnerB);
      expect((await b.from("reports").select("id").eq("id", reportId)).data).toEqual([]); // owner-scoped
    });
  });

  describe("public content", () => {
    test("topics are public; only active questions are readable", async () => {
      const anon = anonClient();
      expect((await anon.from("topics").select("id").eq("id", fixtureTopicId!)).data).toEqual([{ id: fixtureTopicId }]);
      expect((await anon.from("questions").select("id").eq("id", activeQuestionId)).data).toEqual([{ id: activeQuestionId }]);
      expect((await anon.from("questions").select("id").eq("id", inactiveQuestionId)).data).toEqual([]); // inactive hidden

      // The same holds for an authenticated (non-admin) user.
      const a = await signInAs(learnerA);
      expect((await a.from("questions").select("id").eq("id", inactiveQuestionId)).data).toEqual([]);
    });

    test("answer keys are not readable through the Data API", async () => {
      const anon = anonClient();
      // Selecting answer columns is denied (column-level grant), for anon…
      expect((await anon.from("questions").select("answer_text").eq("id", activeQuestionId)).error).not.toBeNull();
      expect((await anon.from("questions").select("solution_steps").eq("id", activeQuestionId)).error).not.toBeNull();
      // …and for an authenticated learner.
      const a = await signInAs(learnerA);
      expect((await a.from("questions").select("hint").eq("id", activeQuestionId)).error).not.toBeNull();
      // Render columns remain readable.
      const ok = await anon.from("questions").select("id, question_text, marks").eq("id", activeQuestionId);
      expect(ok.error).toBeNull();
      expect(ok.data).toEqual([{ id: activeQuestionId, question_text: expect.any(String), marks: expect.any(Number) }]);
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
    test("writes only via the service-role submit_beta_lead(); only admins can read", async () => {
      const anon = anonClient();
      const email = `it-lead-${Date.now()}@mathmentor.test`;

      // Direct insert is revoked — the public cannot write the table directly.
      const direct = await anon
        .from("beta_leads")
        .insert({ full_name: "IT Lead", email, phone: null, role: "parent", selected_plan: "parent-beta", message: null });
      expect(direct.error).not.toBeNull(); // permission denied for table

      // The function is now service-role-only: an anon caller cannot invoke it.
      const anonRpc = await anon.rpc("submit_beta_lead", {
        p_full_name: "IT Lead",
        p_email: email,
        p_role: "parent",
        p_selected_plan: "parent-beta",
        p_phone: null,
        p_message: null,
        p_ip: null,
      });
      expect(anonRpc.error).not.toBeNull(); // permission denied for function

      // The validated Server Action writes via the service role.
      const rpc = await serviceClient().rpc("submit_beta_lead", {
        p_full_name: "IT Lead",
        p_email: email,
        p_role: "parent",
        p_selected_plan: "parent-beta",
        p_phone: null,
        p_message: null,
        p_ip: null,
      });
      expect(rpc.error).toBeNull();
      expect(rpc.data).toBe("ok");

      expect((await anon.from("beta_leads").select("id")).data).toEqual([]); // no public select

      const learner = await signInAs(learnerA);
      expect((await learner.from("beta_leads").select("id")).data).toEqual([]); // non-admin cannot read

      const adminClient = await signInAs(admin);
      const adminRead = await adminClient.from("beta_leads").select("id").eq("email", email);
      expect(adminRead.error).toBeNull();
      expect(adminRead.data?.length).toBeGreaterThanOrEqual(1); // admin can read

      await serviceClient().from("beta_leads").delete().eq("email", email);
    });
  });
});
