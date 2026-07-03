import Link from "next/link";
import { requireRole } from "@/lib/auth/require-role";
import { createClient } from "@/lib/supabase/server";
import {
  decodePracticeSummary,
  isPracticeSummary,
  buildPracticeRecommendation,
  type PracticeSummary,
} from "@/lib/math/practice";
import { resultBand } from "@/lib/math/result-band";
import { WorkedSteps } from "@/components/quiz/Explanation";
import { Badge } from "@/components/ui/Badge";

async function loadReport(reportId: string): Promise<PracticeSummary | null> {
  const supabase = await createClient();
  const { data, error } = await supabase.from("reports").select("data").eq("id", reportId).maybeSingle();
  if (error || !data) return null;
  const payload = (data as { data: unknown }).data;
  return isPracticeSummary(payload) ? payload : null;
}

export default async function PracticeResultPage({
  params,
  searchParams,
}: {
  params: Promise<{ topicSlug: string }>;
  searchParams: Promise<{ report?: string; data?: string }>;
}) {
  await requireRole("learner");
  const { topicSlug } = await params;
  const { report, data } = await searchParams;

  let summary: PracticeSummary | null = null;
  if (report) summary = await loadReport(report);
  if (!summary && data) summary = decodePracticeSummary(data);

  if (!summary) {
    return (
      <div className="mx-auto max-w-2xl">
        <p className="text-sm font-semibold text-brand">Practice</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight">No results to show yet</h1>
        <p className="mt-3 text-muted">Complete a practice run to see your score and worked explanations.</p>
        <div className="mt-8 flex flex-wrap gap-3">
          <Link href={`/learner/practice/${topicSlug}`} className="rounded-xl bg-brand px-5 py-3 font-semibold text-white hover:bg-brand-dark">
            Practise this topic
          </Link>
          <Link href="/learner/practice" className="rounded-xl border border-line px-5 py-3 font-semibold hover:border-brand/40">
            All practice topics
          </Link>
        </div>
      </div>
    );
  }

  const retryHref = `/learner/practice/${summary.topicSlug || topicSlug}${summary.grade ? `?grade=${summary.grade}` : ""}`;
  const mistakes = summary.questions.filter((question) => !question.isCorrect).length;
  const band = resultBand(summary.percentage);

  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <div className="rounded-3xl border border-line bg-white p-8 text-center">
        <p className="text-sm font-semibold text-brand">{summary.topicName} · Grade {summary.grade}</p>
        <p className="mt-4 font-mono text-6xl font-semibold">{summary.percentage}%</p>
        <div className="mt-4 flex justify-center">
          <Badge tone={band.tone}>{band.label}</Badge>
        </div>
        <p className="mt-3 text-muted">
          You scored {summary.score} of {summary.totalMarks} marks · {summary.correct} of {summary.totalQuestions} correct
          {mistakes > 0 ? ` · ${mistakes} to review` : ""}.
        </p>
      </div>

      <div className="rounded-2xl border border-line bg-white p-6">
        <h2 className="text-lg font-semibold">Your next step</h2>
        <p className="mt-2 text-sm leading-6 text-muted">{buildPracticeRecommendation(summary)}</p>
      </div>

      <section>
        <h2 className="text-lg font-semibold">Review</h2>
        <div className="mt-4 space-y-4">
          {summary.questions.map((question, questionIndex) => (
            <div key={question.questionId} className="rounded-2xl border border-line bg-white p-6">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <p className="font-mono text-lg font-semibold">
                  {questionIndex + 1}. {question.questionText}
                </p>
                <span
                  className={`shrink-0 rounded-full px-3 py-1 text-xs font-semibold ${
                    question.isCorrect ? "bg-green-100 text-green-900" : "bg-amber-100 text-amber-950"
                  }`}
                >
                  {question.isCorrect ? "Correct" : "Review"}
                </span>
              </div>
              <p className="mt-3 text-sm text-muted">
                Your answer:{" "}
                <span className="font-mono text-foreground">{question.submitted || "—"}</span>
              </p>
              {!question.isCorrect && (
                <p className="mt-1 text-sm text-muted">
                  Correct answer: <span className="font-mono font-semibold text-foreground">{question.correctAnswer}</span>
                </p>
              )}
              <div className="mt-3 text-muted">
                <p className="text-sm font-semibold text-foreground">Worked steps</p>
                <WorkedSteps steps={question.explanation} className="mt-1" />
              </div>
            </div>
          ))}
        </div>
      </section>

      <div className="flex flex-wrap gap-3">
        <Link href={retryHref} className="rounded-xl bg-brand px-5 py-3 font-semibold text-white hover:bg-brand-dark">
          Retry this topic
        </Link>
        <Link href="/learner/practice" className="rounded-xl border border-line px-5 py-3 font-semibold hover:border-brand/40">
          All practice topics
        </Link>
        <Link href="/learner/topics" className="rounded-xl border border-line px-5 py-3 font-semibold hover:border-brand/40">
          Browse topics
        </Link>
        <Link href="/learner/progress" className="rounded-xl border border-line px-5 py-3 font-semibold hover:border-brand/40">
          View progress
        </Link>
      </div>
    </div>
  );
}
