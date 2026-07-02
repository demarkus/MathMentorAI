"use server";

import { redirect } from "next/navigation";
import { requireRole } from "@/lib/auth/require-role";
import { createServiceRoleClient } from "@/lib/supabase/server";
import type { QuestionInput, QuestionActionResult } from "@/components/admin/QuestionForm";

const QUESTION_GRADES = [9, 10] as const;
const QUESTION_DIFFICULTIES = ["easy", "medium", "hard"] as const;

/**
 * Validates untrusted form input into the exact column shape questions expects.
 * `cognitive_level` is intentionally omitted so the schema default applies.
 */
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

  const marks = Math.round(Number(input?.marks));
  if (!Number.isFinite(marks) || marks < 1) return { error: "Marks must be a whole number of at least 1." };

  const solution_steps = Array.isArray(input?.solution_steps)
    ? input.solution_steps.map((step) => String(step).trim()).filter((step) => step.length > 0)
    : [];

  const is_active = Boolean(input?.is_active);

  return {
    values: { topic_id, grade, question_text, answer_text, hint, solution_steps, difficulty, marks, is_active },
  };
}

export async function createQuestion(input: QuestionInput): Promise<QuestionActionResult> {
  await requireRole("admin");

  const { values, error } = validate(input);
  if (error || !values) return { error: error ?? "Invalid question." };

  const admin = createServiceRoleClient();
  if (!admin) return { error: "Content management is unavailable: the service role key is not configured." };

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

  const { error: updateError } = await admin.from("questions").update(values).eq("id", questionId);
  if (updateError) return { error: "We couldn’t update this question. Please check the fields and try again." };

  redirect("/admin/questions");
}
