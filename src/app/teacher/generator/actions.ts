"use server";

import { requireRole } from "@/lib/auth/require-role";
import { createClient, createServiceRoleClient } from "@/lib/supabase/server";
import {
  buildWorksheetContent,
  selectQuestions,
  clampQuestionCount,
  isGrade,
  isDifficultyOption,
  isResourceType,
  isMissingTableError,
  MAX_QUESTIONS,
  type GeneratorRequest,
  type GenerateResult,
  type SourceQuestion,
  type WorksheetContent,
} from "@/lib/math/teacher-resources";

type QuestionRow = {
  id: string;
  question_text: string;
  answer_text: string;
  hint: string;
  solution_steps: string[] | null;
  difficulty: string;
  marks: number;
};

function toSource(row: QuestionRow): SourceQuestion {
  return {
    id: row.id,
    question_text: row.question_text,
    answer_text: row.answer_text,
    hint: row.hint,
    solution_steps: Array.isArray(row.solution_steps) ? row.solution_steps : [],
    difficulty: row.difficulty,
    marks: row.marks,
  };
}

/**
 * Saves the resource for the current teacher via the service-role client.
 * Returns the new id, or a status when the teacher_resources table is not yet
 * present in the schema (best-effort). The generated worksheet is shown either
 * way, so a missing table is a degradation rather than a hard failure.
 */
async function saveResource(
  teacherId: string,
  topicId: string,
  content: WorksheetContent,
): Promise<{ id?: string; status?: "unavailable" | "failed" }> {
  const admin = createServiceRoleClient();
  if (!admin) return { status: "unavailable" };

  const { data, error } = await admin
    .from("teacher_resources")
    .insert({
      teacher_id: teacherId,
      title: content.title,
      grade: content.grade,
      topic_id: topicId,
      resource_type: content.resourceType,
      content,
    })
    .select("id")
    .single();

  if (error || !data) {
    return { status: isMissingTableError(error) ? "unavailable" : "failed" };
  }
  return { id: (data as { id: string }).id };
}

export async function generateWorksheet(request: GeneratorRequest): Promise<GenerateResult> {
  const user = await requireRole("teacher");

  // Validate untrusted input.
  const grade = Number(request?.grade);
  if (!isGrade(grade)) return { error: "Please choose Grade 9 or Grade 10." };
  const topicSlug = String(request?.topicSlug ?? "");
  if (!topicSlug) return { error: "Please choose a topic." };
  const count = clampQuestionCount(Number(request?.count));
  const difficulty = isDifficultyOption(request?.difficulty) ? request.difficulty : "mixed";
  const resourceType = isResourceType(request?.resourceType) ? request.resourceType : "worksheet";
  const title = typeof request?.title === "string" ? request.title.trim().slice(0, 120) : "";

  const supabase = await createClient();

  const { data: topicRow, error: topicError } = await supabase
    .from("topics")
    .select("id, name, slug, grade")
    .eq("slug", topicSlug)
    .eq("grade", grade)
    .maybeSingle();
  if (topicError) return { error: "We couldn’t load that topic. Please try again." };
  if (!topicRow) return { error: "That topic wasn’t found for the selected grade." };
  const topic = topicRow as { id: string; name: string; slug: string; grade: number };

  let query = supabase
    .from("questions")
    .select("id, question_text, answer_text, hint, solution_steps, difficulty, marks")
    .eq("topic_id", topic.id)
    .eq("is_active", true);
  if (difficulty !== "mixed") query = query.eq("difficulty", difficulty);
  const { data: questionData, error: questionError } = await query.limit(MAX_QUESTIONS * 3);
  if (questionError) return { error: "We couldn’t load questions. Please try again." };

  const source = ((questionData ?? []) as unknown as QuestionRow[]).map(toSource);
  const selected = selectQuestions(source, count, difficulty);
  if (selected.length === 0) {
    return {
      error: "No active questions are available for this topic and difficulty. Try a different grade, topic, or difficulty.",
    };
  }

  const normalized: GeneratorRequest = { grade, topicSlug, count, difficulty, resourceType, title };
  const content = buildWorksheetContent(normalized, topic, selected);

  const saved = await saveResource(user.id, topic.id, content);
  const savedNote =
    saved.status === "unavailable"
      ? "Resource storage isn’t available yet, so this wasn’t saved. You can still print it below."
      : saved.status === "failed"
        ? "We couldn’t save this resource, but you can still print it below."
        : undefined;

  return { content, resourceId: saved.id, savedNote };
}
