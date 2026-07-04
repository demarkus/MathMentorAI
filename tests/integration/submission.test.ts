import { describe, test, expect, beforeAll, afterAll } from "vitest";
import {
  hasIntegrationEnv,
  serviceClient,
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
 * Parts B + D: clients cannot write assessment rows or call the finalize
 * function; the trusted finalize path is atomic, idempotent, and owner-checked.
 * Gated on the test project (needs the trusted_submission migration applied).
 */
describe.skipIf(!hasIntegrationEnv)("trusted submission (Parts B+D)", () => {
  let learnerA: TestUser;
  let learnerB: TestUser;
  let lpA: string;
  let lpB: string;
  let topicId: string | undefined;
  let questionId: string;

  beforeAll(async () => {
    [learnerA, learnerB] = await Promise.all([
      createTestUser("student", { grade: 9 }),
      createTestUser("student", { grade: 9 }),
    ]);
    [lpA, lpB] = await Promise.all([learnerProfileId(learnerA.id), learnerProfileId(learnerB.id)]);
    const topic = await createFixtureTopic();
    topicId = topic.id;
    questionId = (await createFixtureQuestion(topic.id, true)).id;
  });

  afterAll(async () => {
    await deleteFixtureTopic(topicId);
    await deleteTestUsers(learnerA, learnerB);
  });

  function finalizeArgs(sessionId: string, learnerId: string, key: string) {
    return {
      p_session_id: sessionId,
      p_learner_id: learnerId,
      p_submission_key: key,
      p_score: 1,
      p_total_marks: 1,
      p_percentage: 100,
      p_report_type: "practice",
      p_report_data: { topicName: "T" },
      p_attempts: [{ questionId, submitted: "2", isCorrect: true, score: 1 }],
    };
  }

  test("learners cannot directly insert attempts / quiz_sessions / reports", async () => {
    const client = await signInAs(learnerA);
    expect((await client.from("quiz_sessions").insert({ learner_id: lpA, quiz_type: "practice" })).error).not.toBeNull();
    expect(
      (await client.from("attempts").insert({ learner_id: lpA, question_id: questionId, submitted_answer: "x", is_correct: true, score: 1 })).error,
    ).not.toBeNull();
    expect((await client.from("reports").insert({ learner_id: lpA, report_type: "practice", data: {} })).error).not.toBeNull();
  });

  test("finalize_quiz_submission is not callable by a learner", async () => {
    const client = await signInAs(learnerA);
    const res = await client.rpc("finalize_quiz_submission", finalizeArgs(crypto.randomUUID(), lpA, crypto.randomUUID()));
    expect(res.error).not.toBeNull();
  });

  test("trusted finalize is atomic and idempotent", async () => {
    const svc = serviceClient();
    const created = await svc
      .from("quiz_sessions")
      .insert({ learner_id: lpA, quiz_type: "practice", status: "issued", topic_id: topicId, grade: 9, question_ids: [questionId] })
      .select("id")
      .single();
    const sessionId = (created.data as { id: string }).id;
    const args = finalizeArgs(sessionId, lpA, crypto.randomUUID());

    const r1 = await svc.rpc("finalize_quiz_submission", args);
    expect(r1.error).toBeNull();
    const r2 = await svc.rpc("finalize_quiz_submission", args); // retry
    expect(r2.data).toBe(r1.data); // same report id

    expect((await svc.from("attempts").select("id").eq("quiz_session_id", sessionId)).data?.length).toBe(1);
    expect((await svc.from("reports").select("id").eq("quiz_session_id", sessionId)).data?.length).toBe(1);
    expect((await svc.from("quiz_sessions").select("status").eq("id", sessionId)).data).toEqual([{ status: "submitted" }]);
  });

  test("finalize rejects a session that belongs to another learner", async () => {
    const svc = serviceClient();
    const created = await svc
      .from("quiz_sessions")
      .insert({ learner_id: lpA, quiz_type: "practice", status: "issued", topic_id: topicId, grade: 9, question_ids: [questionId] })
      .select("id")
      .single();
    const sessionId = (created.data as { id: string }).id;
    const res = await svc.rpc("finalize_quiz_submission", finalizeArgs(sessionId, lpB, crypto.randomUUID()));
    expect(res.error).not.toBeNull();
  });
});
