import { describe, test, expect, afterAll } from "vitest";
import {
  hasIntegrationEnv,
  createTestUser,
  learnerProfileId,
  serviceClient,
  createFixtureTopic,
  createFixtureQuestion,
  deleteFixtureTopic,
  deleteTestUsers,
  type TestUser,
} from "./helpers";

/**
 * Objective 5 regression: the database is the backstop for the answer-length
 * bound. Gated on INTEGRATION_SUPABASE_* (needs the 20260704150000_bound_quiz_abuse
 * migration applied to the test project). Runs against a dedicated test project.
 */
describe.skipIf(!hasIntegrationEnv)("quiz storage bounds (Objective 5)", () => {
  let student: TestUser | undefined;
  let topicId: string | undefined;

  afterAll(async () => {
    await deleteFixtureTopic(topicId);
    if (student) await deleteTestUsers(student);
  });

  test("an oversized submitted_answer is rejected by the DB CHECK", async () => {
    student = await createTestUser("student", { grade: 9 });
    const learnerId = await learnerProfileId(student.id);
    const topic = await createFixtureTopic();
    topicId = topic.id;
    const question = await createFixtureQuestion(topic.id, true);

    const svc = serviceClient();
    // 501 chars — one over the 500-char cap.
    const oversized = await svc.from("attempts").insert({
      learner_id: learnerId,
      question_id: question.id,
      submitted_answer: "x".repeat(501),
      is_correct: false,
      score: 0,
    });
    expect(oversized.error).not.toBeNull(); // CHECK violation

    // A within-bound answer is accepted.
    const ok = await svc.from("attempts").insert({
      learner_id: learnerId,
      question_id: question.id,
      submitted_answer: "x".repeat(500),
      is_correct: false,
      score: 0,
    });
    expect(ok.error).toBeNull();
  });
});
