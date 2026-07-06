"use server";

import { redirect } from "next/navigation";
import { requireRole } from "@/lib/auth/require-role";
import { createServiceRoleClient } from "@/lib/supabase/server";
import type { QuestionInput, QuestionActionResult } from "@/components/admin/QuestionForm";

const QUESTION_GRADES = [9, 10] as const;
const QUESTION_DIFFICULTIES = ["easy", "medium", "hard"] as const;
const QUESTION_COGNITIVE_LEVELS = ["routine procedure", "complex procedure", "problem solving"] as const;

/** Validates untrusted form input into the exact column shape questions expects. */
function validate(input: QuestionInput): { values?: Record<string, unknown>; error?: string } {
  const topic_id = String(input?.topic_id ?? "").trim();
  if (!topic_id) return { error: "Please choose a topic." };

  const grade = Number(input?.grade);
  if (!QUESTION_GRADES.includes(grade as (typeof QUESTION_GRADES)[number])) {
    return { error: "Please choose Grade 9 or Grade 10." };
  }

  const question_text = String(input?.question_text ?? "").trim();
  if (!question_text) return { error: "Question text is required." };

  const answer_text = String(input?.answer_text ?? "").trim();
  if (!answer_text) return { error: "An answer is required." };

  const hint = String(input?.hint ?? "").trim();
  if (!hint) return { error: "A hint is required." };

  const difficulty = String(input?.difficulty ?? "");
  if (!QUESTION_DIFFICULTIES.includes(difficulty as (typeof QUESTION_DIFFICULTIES)[number])) {
    return { error: "Please choose a valid difficulty." };
  }

  // Older callers may omit it — the schema default is "routine procedure".
  const cognitive_level = String(input?.cognitive_level ?? "routine procedure");
  if (!QUESTION_COGNITIVE_LEVELS.includes(cognitive_level as (typeof QUESTION_COGNITIVE_LEVELS)[number])) {
    return { error: "Please choose a valid cognitive level." };
  }

  const marks = Math.round(Number(input?.marks));
  if (!Number.isFinite(marks) || marks < 1) return { error: "Marks must be a whole number of at least 1." };

  const solution_steps = Array.isArray(input?.solution_steps)
    ? input.solution_steps.map((step) => String(step).trim()).filter((step) => step.length > 0)
    : [];

  const is_active = Boolean(input?.is_active);

  return {
    values: {
      topic_id, grade, question_text, answer_text, hint, solution_steps,
      difficulty, cognitive_level, marks, is_active,
    },
  };
}

/**
 * Confirms the chosen topic exists and belongs to the submitted grade. A
 * mismatched pair would render in topic practice but be rejected at submission,
 * so it is refused here (and, as a backstop, by the questions(topic_id, grade)
 * composite FK in the database).
 */
async function assertTopicMatchesGrade(
  admin: ReturnType<typeof createServiceRoleClient>,
  topicId: string,
  grade: number,
): Promise<string | null> {
  if (!admin) return null; // caller already surfaced the config error
  const { data, error } = await admin.from("topics").select("grade").eq("id", topicId).maybeSingle();
  if (error) return "We couldn’t verify the topic. Please try again.";
  const topic = data as { grade: number } | null;
  if (!topic) return "That topic no longer exists. Please choose another.";
  if (topic.grade !== grade) return "That topic belongs to a different grade. Choose a topic that matches the grade.";
  return null;
}

export async function createQuestion(input: QuestionInput): Promise<QuestionActionResult> {
  await requireRole("admin");

  const { values, error } = validate(input);
  if (error || !values) return { error: error ?? "Invalid question." };

  const admin = createServiceRoleClient();
  if (!admin) return { error: "Content management is unavailable: the service role key is not configured." };

  const mismatch = await assertTopicMatchesGrade(admin, values.topic_id as string, values.grade as number);
  if (mismatch) return { error: mismatch };

  const { error: insertError } = await admin.from("questions").insert(values);
  if (insertError) return { error: "We couldn’t save this question. Please check the fields and try again." };

  redirect("/admin/questions");
}

export async function updateQuestion(id: string, input: QuestionInput): Promise<QuestionActionResult> {
  await requireRole("admin");

  const questionId = String(id ?? "").trim();
  if (!questionId) return { error: "Missing question id." };

  const { values, error } = validate(input);
  if (error || !values) return { error: error ?? "Invalid question." };

  const admin = createServiceRoleClient();
  if (!admin) return { error: "Content management is unavailable: the service role key is not configured." };

  const mismatch = await assertTopicMatchesGrade(admin, values.topic_id as string, values.grade as number);
  if (mismatch) return { error: mismatch };

  const { error: updateError } = await admin.from("questions").update(values).eq("id", questionId);
  if (updateError) return { error: "We couldn’t update this question. Please check the fields and try again." };

  redirect("/admin/questions");
}
