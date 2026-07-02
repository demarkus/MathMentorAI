import Link from "next/link";
import { notFound } from "next/navigation";
import { requireRole } from "@/lib/auth/require-role";
import { createClient } from "@/lib/supabase/server";
import { DashboardHeader } from "@/components/dashboard/DashboardHeader";
import { DashboardGrid } from "@/components/dashboard/DashboardGrid";
import { TopicCard, type CatalogueTopic } from "@/components/dashboard/TopicCard";
import { QuizShell, type QuizShellQuestion } from "@/components/quiz/QuizShell";
import { selectPracticeQuestions, explanationFor, PRACTICE_MAX_QUESTIONS } from "@/lib/math/practice";
import type { PracticeQuestion } from "@/lib/math/practice";
import { submitPractice } from "../actions";

const VALID_GRADES = [9, 10];

type QuestionRow = {
  id: string;
  grade: number;
  marks: number;
  difficulty: string;
  question_text: string;
  answer_text: string;
  hint: string;
  solution_steps: string[] | null;
  topic_id: string;
};

function BackLink() {
  return (
    <Link href="/learner/practice" className="inline-flex items-center gap-1 text-sm font-semibold text-brand hover:underline">
      <span aria-hidden>←</span> All practice topics
    </Link>
  );
}

export default async function TopicPracticePage({
  params,
  searchParams,
}: {
  params: Promise<{ topicSlug: string }>;
  searchParams: Promise<{ grade?: string }>;
}) {
  await requireRole("learner");
  const { topicSlug } = await params;
  const { grade } = await searchParams;

  const supabase = await createClient();
  let topicQuery = supabase
    .from("topics")
    .select("id, grade, name, slug, description, display_order")
    .eq("slug", topicSlug)
    .order("grade", { ascending: true });

  const gradeNum = grade ? Number(grade) : undefined;
  if (gradeNum && VALID_GRADES.includes(gradeNum)) topicQuery = topicQuery.eq("grade", gradeNum);

  const { data: topicData, error: topicError } = await topicQuery;

  if (topicError) {
    return (
      <div className="space-y-8">
        <BackLink />
        <div className="rounded-2xl border border-line bg-white p-8 text-center">
          <h2 className="text-lg font-semibold">We couldn’t load this topic</h2>
          <p className="mt-2 text-sm text-muted">Please go back and try again.</p>
        </div>
      </div>
    );
  }

  const matchedTopics = (topicData ?? []) as CatalogueTopic[];
  if (matchedTopics.length === 0) notFound();

  // Same slug can exist in more than one grade — let the learner choose.
  if (matchedTopics.length > 1) {
    return (
      <div className="space-y-8">
        <BackLink />
        <DashboardHeader
          eyebrow="Practice"
          title={matchedTopics[0].name}
          subtitle="This topic is offered in more than one grade. Choose the grade you want to practise."
        />
        <DashboardGrid cols={2}>
          {matchedTopics.map((topic) => (
            <TopicCard key={topic.id} topic={topic} hrefBase="/learner/practice" cta="Practise topic" />
          ))}
        </DashboardGrid>
      </div>
    );
  }

  const topic = matchedTopics[0];
  const { data: questionData } = await supabase
    .from("questions")
    .select("id, grade, marks, difficulty, question_text, answer_text, hint, solution_steps, topic_id")
    .eq("topic_id", topic.id)
    .eq("is_active", true)
    .order("marks", { ascending: true })
    .limit(PRACTICE_MAX_QUESTIONS);

  const allQuestions: PracticeQuestion[] = ((questionData ?? []) as unknown as QuestionRow[]).map((row) => ({
    id: row.id,
    question_text: row.question_text,
    answer_text: row.answer_text,
    hint: row.hint,
    solution_steps: Array.isArray(row.solution_steps) ? row.solution_steps : [],
    difficulty: row.difficulty,
    marks: row.marks,
    grade: row.grade,
    topic_id: row.topic_id,
    topicName: topic.name,
    topicSlug: topic.slug,
  }));
  const questions = selectPracticeQuestions(allQuestions);

  if (questions.length === 0) {
    return (
      <div className="space-y-8">
        <BackLink />
        <DashboardHeader eyebrow={`Grade ${topic.grade} practice`} title={topic.name} subtitle={topic.description} />
        <div className="rounded-2xl border border-line bg-white p-8 text-center">
          <h2 className="text-lg font-semibold">No questions yet</h2>
          <p className="mt-2 text-sm text-muted">There aren’t any active questions for this topic right now. Please check back soon.</p>
        </div>
      </div>
    );
  }

  // Practice reveals answers/explanations after each attempt (formative), so
  // they are sent to the client here — unlike the diagnostic.
  const quizQuestions: QuizShellQuestion[] = questions.map((question) => ({
    id: question.id,
    question_text: question.question_text,
    difficulty: question.difficulty,
    marks: question.marks,
    topicName: question.topicName,
    answerText: question.answer_text,
    explanation: explanationFor(question),
  }));

  const onSubmit = submitPractice.bind(null, topic.slug, topic.grade);

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <BackLink />
      <div>
        <p className="text-sm font-semibold text-brand">Grade {topic.grade} practice</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight">{topic.name}</h1>
        <p className="mt-3 text-muted">
          Answer {quizQuestions.length} question{quizQuestions.length === 1 ? "" : "s"}. Check each answer to see the
          worked explanation, then submit to save your results.
        </p>
      </div>
      <QuizShell questions={quizQuestions} onSubmit={onSubmit} submitLabel="Finish & see results" reveal />
    </div>
  );
}
