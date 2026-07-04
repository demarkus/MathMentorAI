import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { requireRole } from "@/lib/auth/require-role";
import { createClient, createServiceRoleClient } from "@/lib/supabase/server";
import { DashboardHeader } from "@/components/dashboard/DashboardHeader";
import { DashboardGrid } from "@/components/dashboard/DashboardGrid";
import { TopicCard, type CatalogueTopic } from "@/components/dashboard/TopicCard";
import { QuizShell, type QuizShellQuestion } from "@/components/quiz/QuizShell";
import { QuizStartForm } from "@/components/quiz/QuizStartForm";
import { loadSession, isSessionRunnable } from "@/lib/quiz/session";
import { startPractice, submitPractice, checkPracticeAnswer } from "../actions";

const VALID_GRADES = [9, 10];

type RenderRow = {
  id: string;
  grade: number;
  marks: number;
  difficulty: string;
  question_text: string;
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
  searchParams: Promise<{ grade?: string; session?: string }>;
}) {
  const user = await requireRole("learner");
  const { topicSlug } = await params;
  const { grade, session: sessionId } = await searchParams;

  const supabase = await createClient();
  const { data: learner } = await supabase
    .from("learner_profiles")
    .select("id")
    .eq("user_id", user.id)
    .maybeSingle();
  const learnerId = (learner as { id: string } | null)?.id;
  if (!learnerId) redirect("/onboarding");

  // ---- Run view: an explicitly-started session is being taken. GET only reads.
  if (sessionId) {
    const admin = createServiceRoleClient();
    const session = admin ? await loadSession(admin, sessionId, learnerId) : null;
    if (!isSessionRunnable(session, "practice")) redirect(`/learner/practice/${topicSlug}`);

    // Authoritative topic from the session, not the URL.
    const { data: topicRow } = await supabase
      .from("topics")
      .select("id, grade, name, slug")
      .eq("id", session!.topicId ?? "")
      .maybeSingle();
    const topic = topicRow as { id: string; grade: number; name: string; slug: string } | null;

    const { data, error } = await supabase
      .from("questions")
      .select("id, grade, marks, difficulty, question_text")
      .in("id", session!.questionIds)
      .eq("is_active", true);

    if (error || !topic) {
      return (
        <div className="space-y-8">
          <BackLink />
          <div className="rounded-2xl border border-line bg-white p-8 text-center">
            <h2 className="text-lg font-semibold">We couldn’t load this practice</h2>
            <p className="mt-2 text-sm text-muted">Something went wrong fetching your questions. Please go back and try again.</p>
          </div>
        </div>
      );
    }

    const byId = new Map(((data ?? []) as unknown as RenderRow[]).map((row) => [row.id, row]));
    if (byId.size !== session!.questionIds.length) redirect(`/learner/practice/${topicSlug}`);

    const quizQuestions: QuizShellQuestion[] = session!.questionIds.map((id) => {
      const row = byId.get(id)!;
      return {
        id: row.id,
        question_text: row.question_text,
        difficulty: row.difficulty,
        marks: row.marks,
        topicName: topic.name,
        grade: row.grade,
      };
    });

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
        <QuizShell
          questions={quizQuestions}
          onSubmit={submitPractice.bind(null, sessionId, topic.slug)}
          onCheck={checkPracticeAnswer.bind(null, sessionId)}
          submitLabel="Finish & see results"
          reveal
        />
      </div>
    );
  }

  // ---- Intro view: resolve the topic, then offer an explicit Start button.
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
  const { count, error: countError } = await supabase
    .from("questions")
    .select("id", { count: "exact", head: true })
    .eq("topic_id", topic.id)
    .eq("is_active", true);

  if (countError) {
    return (
      <div className="space-y-8">
        <BackLink />
        <DashboardHeader eyebrow={`Grade ${topic.grade} practice`} title={topic.name} subtitle={topic.description} />
        <div className="rounded-2xl border border-line bg-white p-8 text-center">
          <h2 className="text-lg font-semibold">We couldn’t load this topic</h2>
          <p className="mt-2 text-sm text-muted">Please refresh to try again.</p>
        </div>
      </div>
    );
  }

  if (!count || count === 0) {
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

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <BackLink />
      <div>
        <p className="text-sm font-semibold text-brand">Grade {topic.grade} practice</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight">{topic.name}</h1>
        <p className="mt-3 text-muted">{topic.description}</p>
        <p className="mt-2 text-muted">Check each answer for a worked explanation as you go. Start when you’re ready.</p>
      </div>
      <QuizStartForm
        action={startPractice.bind(null, topic.id, topic.slug, topic.grade)}
        label="Start practice"
        pendingLabel="Starting…"
      />
    </div>
  );
}
