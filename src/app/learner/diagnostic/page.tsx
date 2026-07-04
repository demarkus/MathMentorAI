import Link from "next/link";
import { redirect } from "next/navigation";
import { requireRole } from "@/lib/auth/require-role";
import { createClient, createServiceRoleClient } from "@/lib/supabase/server";
import { QuizShell, type QuizShellQuestion } from "@/components/quiz/QuizShell";
import { QuizStartForm } from "@/components/quiz/QuizStartForm";
import { loadSession, isSessionRunnable } from "@/lib/quiz/session";
import { startDiagnostic, submitDiagnostic } from "./actions";

type RenderRow = {
  id: string;
  grade: number;
  marks: number;
  difficulty: string;
  question_text: string;
  topics: { name: string } | { name: string }[] | null;
};

function Frame({ children }: { children: React.ReactNode }) {
  return <div className="mx-auto max-w-3xl space-y-6">{children}</div>;
}

function BackToDashboard() {
  return (
    <Link href="/learner" className="mt-8 inline-flex rounded-xl bg-brand px-5 py-3 font-semibold text-white hover:bg-brand-dark">
      Back to dashboard
    </Link>
  );
}

export default async function DiagnosticPage({
  searchParams,
}: {
  searchParams: Promise<{ session?: string }>;
}) {
  const user = await requireRole("learner");
  const { session: sessionId } = await searchParams;

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
    // Wrong owner/type, already submitted, or expired -> back to the clean intro.
    if (!isSessionRunnable(session, "diagnostic")) redirect("/learner/diagnostic");

    const { data, error } = await supabase
      .from("questions")
      .select("id, grade, marks, difficulty, question_text, topics(name)")
      .in("id", session!.questionIds)
      .eq("is_active", true);

    // Distinguish a DB failure from a set that changed under the learner.
    if (error) {
      return (
        <Frame>
          <p className="text-sm font-semibold text-brand">Diagnostic</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight">We couldn’t load your diagnostic</h1>
          <p className="mt-3 text-muted">Something went wrong fetching your questions. Please try again in a moment.</p>
          <BackToDashboard />
        </Frame>
      );
    }

    const byId = new Map(((data ?? []) as unknown as RenderRow[]).map((row) => [row.id, row]));
    // Preserve the issued order; if any issued question is gone, restart cleanly.
    if (byId.size !== session!.questionIds.length) redirect("/learner/diagnostic");

    const quizQuestions: QuizShellQuestion[] = session!.questionIds.map((id) => {
      const row = byId.get(id)!;
      const topic = Array.isArray(row.topics) ? row.topics[0] : row.topics;
      return {
        id: row.id,
        question_text: row.question_text,
        difficulty: row.difficulty,
        marks: row.marks,
        topicName: topic?.name ?? "Algebra",
        grade: row.grade,
      };
    });

    return (
      <Frame>
        <div>
          <p className="text-sm font-semibold text-brand">Diagnostic</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight">Let’s find your starting point.</h1>
          <p className="mt-3 text-muted">
            Answer {quizQuestions.length} questions across Grade 9 and Grade 10 algebra. Use Previous and Next to move
            between them, then submit when you’re ready.
          </p>
        </div>
        <QuizShell questions={quizQuestions} onSubmit={submitDiagnostic.bind(null, sessionId)} submitLabel="Submit diagnostic" />
      </Frame>
    );
  }

  // ---- Intro view: no session yet. Reads only; the Start button issues one.
  const { count, error: countError } = await supabase
    .from("questions")
    .select("id", { count: "exact", head: true })
    .eq("is_active", true);

  if (countError) {
    return (
      <Frame>
        <p className="text-sm font-semibold text-brand">Diagnostic</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight">We couldn’t load the diagnostic</h1>
        <p className="mt-3 text-muted">Something went wrong. Please refresh to try again.</p>
        <BackToDashboard />
      </Frame>
    );
  }

  if (!count || count === 0) {
    return (
      <Frame>
        <p className="text-sm font-semibold text-brand">Diagnostic</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight">No diagnostic available yet</h1>
        <p className="mt-3 text-muted">There aren’t any active questions to build a diagnostic right now. Please check back soon.</p>
        <BackToDashboard />
      </Frame>
    );
  }

  return (
    <Frame>
      <div>
        <p className="text-sm font-semibold text-brand">Diagnostic</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight">Ready when you are.</h1>
        <p className="mt-3 text-muted">
          The diagnostic mixes Grade 9 and Grade 10 algebra to find your strengths and focus areas. It takes a few
          minutes. Start when you’re ready.
        </p>
      </div>
      <QuizStartForm action={startDiagnostic} label="Start diagnostic" pendingLabel="Starting…" />
    </Frame>
  );
}
