import Link from "next/link";
import { notFound } from "next/navigation";
import { RoleHeader } from "@/components/role-header";
import { requireRole } from "@/lib/auth/require-role";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { DashboardHeader } from "@/components/dashboard/DashboardHeader";
import {
  QuestionForm,
  QUESTION_COGNITIVE_LEVELS,
  type FormTopic,
  type QuestionInput,
  type QuestionDifficulty,
  type QuestionCognitiveLevel,
} from "@/components/admin/QuestionForm";
import { updateQuestion } from "../../actions";

type QuestionRow = {
  id: string;
  topic_id: string;
  grade: number;
  question_text: string;
  answer_text: string;
  hint: string;
  solution_steps: unknown;
  difficulty: string;
  cognitive_level: string;
  marks: number;
  is_active: boolean;
};

function toSteps(value: unknown): string[] {
  return Array.isArray(value) ? value.map((step) => String(step)) : [];
}

export default async function EditQuestionPage({ params }: { params: Promise<{ id: string }> }) {
  await requireRole("admin");
  const { id } = await params;

  const admin = createServiceRoleClient();
  if (!admin) {
    return (
      <>
        <RoleHeader role="admin" />
        <main className="mx-auto max-w-3xl px-5 py-10">
          <div className="rounded-2xl border border-line bg-white p-8 text-center text-sm text-muted">
            Question management is unavailable: the service role key is not configured.
          </div>
        </main>
      </>
    );
  }

  const [{ data: topicData }, { data: questionData, error }] = await Promise.all([
    admin
      .from("topics")
      .select("id, name, slug, grade")
      .order("grade", { ascending: true })
      .order("display_order", { ascending: true }),
    admin
      .from("questions")
      .select("id, topic_id, grade, question_text, answer_text, hint, solution_steps, difficulty, cognitive_level, marks, is_active")
      .eq("id", id)
      .maybeSingle(),
  ]);

  if (error || !questionData) notFound();
  const question = questionData as QuestionRow;
  const topics = (topicData ?? []) as FormTopic[];

  const initial: QuestionInput = {
    topic_id: question.topic_id,
    grade: question.grade,
    question_text: question.question_text,
    answer_text: question.answer_text,
    hint: question.hint,
    solution_steps: toSteps(question.solution_steps),
    difficulty: question.difficulty as QuestionDifficulty,
    cognitive_level: (QUESTION_COGNITIVE_LEVELS as readonly string[]).includes(question.cognitive_level)
      ? (question.cognitive_level as QuestionCognitiveLevel)
      : "routine procedure",
    marks: question.marks,
    is_active: question.is_active,
  };

  const onSubmit = updateQuestion.bind(null, question.id);

  return (
    <>
      <RoleHeader role="admin" />
      <main className="mx-auto max-w-3xl space-y-8 px-5 py-10">
        <Link
          href="/admin/questions"
          className="inline-flex items-center gap-1 text-sm font-semibold text-brand hover:underline"
        >
          <span aria-hidden>←</span> Back to questions
        </Link>

        <DashboardHeader
          eyebrow="Admin"
          title="Edit question"
          subtitle="Update the question, or deactivate it to hide it from learners without deleting it."
        />

        <QuestionForm topics={topics} initial={initial} onSubmit={onSubmit} submitLabel="Save changes" />
      </main>
    </>
  );
}
