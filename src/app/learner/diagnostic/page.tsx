import Link from "next/link";
import { requireRole } from "@/lib/auth/require-role";
import { createClient } from "@/lib/supabase/server";
import { QuizShell, type QuizShellQuestion } from "@/components/quiz/QuizShell";
import { selectDiagnosticQuestions, type DiagnosticQuestion } from "@/lib/math/diagnostic";
import { submitDiagnostic } from "./actions";

type QuestionRow = {
  id: string;
  grade: number;
  marks: number;
  difficulty: string;
  question_text: string;
  answer_text: string;
  topic_id: string;
  topics: { name: string; slug: string } | { name: string; slug: string }[] | null;
};

export default async function DiagnosticPage() {
  await requireRole("learner");

  const supabase = await createClient();
  const { data } = await supabase
    .from("questions")
    .select("id, grade, marks, difficulty, question_text, answer_text, topic_id, topics(name, slug)")
    .eq("is_active", true)
    .order("grade", { ascending: true });

  const all: DiagnosticQuestion[] = ((data ?? []) as unknown as QuestionRow[]).map((row) => {
    const topic = Array.isArray(row.topics) ? row.topics[0] : row.topics;
    return {
      id: row.id,
      question_text: row.question_text,
      answer_text: row.answer_text,
      difficulty: row.difficulty,
      marks: row.marks,
      grade: row.grade,
      topic_id: row.topic_id,
      topicName: topic?.name ?? "Algebra",
      topicSlug: topic?.slug ?? "",
    };
  });

  const selected = selectDiagnosticQuestions(all);

  if (selected.length === 0) {
    return (
      <div className="mx-auto max-w-2xl">
        <p className="text-sm font-semibold text-brand">Diagnostic</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight">No diagnostic available yet</h1>
        <p className="mt-3 text-muted">There aren’t any active questions to build a diagnostic right now. Please check back soon.</p>
        <Link href="/learner" className="mt-8 inline-flex rounded-xl bg-brand px-5 py-3 font-semibold text-white hover:bg-brand-dark">
          Back to dashboard
        </Link>
      </div>
    );
  }

  // Correct answers are deliberately not sent to the client; the server action marks them.
  const quizQuestions: QuizShellQuestion[] = selected.map((question) => ({
    id: question.id,
    question_text: question.question_text,
    difficulty: question.difficulty,
    marks: question.marks,
    topicName: question.topicName,
  }));

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <p className="text-sm font-semibold text-brand">Diagnostic</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight">Let’s find your starting point.</h1>
        <p className="mt-3 text-muted">
          Answer {quizQuestions.length} questions across Grade 9 and Grade 10 algebra. Use Previous and Next to move
          between them, then submit when you’re ready.
        </p>
      </div>
      <QuizShell questions={quizQuestions} onSubmit={submitDiagnostic} submitLabel="Submit diagnostic" />
    </div>
  );
}
