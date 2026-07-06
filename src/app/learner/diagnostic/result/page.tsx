import Link from "next/link";
import { requireRole } from "@/lib/auth/require-role";
import { createClient } from "@/lib/supabase/server";
import { QuizResultSummary } from "@/components/quiz/QuizResultSummary";
import { WorkedSteps, HintBox } from "@/components/quiz/Explanation";
import { EmptyState } from "@/components/ui/EmptyState";
import { formatQuestion } from "@/lib/math/format-question";
import {
  isDiagnosticSummary,
  isDiagnosticReviewItem,
  type DiagnosticSummary,
} from "@/lib/math/diagnostic";

/**
 * Loads a persisted diagnostic report the learner owns. Results are only ever
 * read from the reports table (RLS-scoped to the owner) — there is no unsigned
 * client-supplied fallback. The report_type must match this route, so a valid
 * practice/progress report id cannot be rendered as a diagnostic.
 */
async function loadReport(reportId: string): Promise<DiagnosticSummary | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("reports")
    .select("data, report_type")
    .eq("id", reportId)
    .eq("report_type", "diagnostic")
    .maybeSingle();
  if (error || !data) return null;
  const payload = (data as { data: unknown }).data;
  return isDiagnosticSummary(payload) ? payload : null;
}

export default async function DiagnosticResultPage({
  searchParams,
}: {
  searchParams: Promise<{ report?: string }>;
}) {
  await requireRole("learner");
  const { report } = await searchParams;

  const summary: DiagnosticSummary | null = report ? await loadReport(report) : null;

  if (!summary) {
    return (
      <div className="mx-auto max-w-2xl">
        <EmptyState
          headingLevel="h1"
          title="No results to show yet"
          description="Take the diagnostic to see your score, strengths, and focus areas."
          action={
            <>
              <Link href="/learner/diagnostic" className="rounded-xl bg-brand px-5 py-3 font-semibold text-white hover:bg-brand-dark">
                Take the diagnostic
              </Link>
              <Link href="/learner" className="rounded-xl border border-line px-5 py-3 font-semibold hover:border-brand/40">
                Back to dashboard
              </Link>
            </>
          }
        />
      </div>
    );
  }

  // Older persisted reports have no review; malformed items are skipped rather
  // than breaking the whole page.
  const review = (summary.review ?? []).filter(isDiagnosticReviewItem);

  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <QuizResultSummary summary={summary} />

      {review.length > 0 && (
        <section>
          <h2 className="text-lg font-semibold">Question-by-question review</h2>
          <div className="mt-4 space-y-4">
            {review.map((item, itemIndex) => (
              <div key={item.questionId} className="rounded-2xl border border-line bg-white p-6">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <p className="font-mono text-lg font-semibold">
                    {itemIndex + 1}. {formatQuestion(item.questionText)}
                  </p>
                  <span
                    className={`shrink-0 rounded-full px-3 py-1 text-xs font-semibold ${
                      item.isCorrect ? "bg-green-100 text-green-900" : "bg-amber-100 text-amber-950"
                    }`}
                  >
                    {item.isCorrect ? "Correct" : "Review"}
                  </span>
                </div>

                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  <div className="rounded-xl border border-line p-3">
                    <p className="text-xs font-semibold uppercase tracking-wide text-muted">Your answer</p>
                    <p className="mt-1 font-mono text-foreground">
                      {item.submitted.trim() ? formatQuestion(item.submitted) : "—"}
                    </p>
                  </div>
                  <div className="rounded-xl border border-line p-3">
                    <p className="text-xs font-semibold uppercase tracking-wide text-muted">Correct answer</p>
                    <p className="mt-1 font-mono font-semibold text-foreground">
                      {formatQuestion(item.correctAnswer)}
                    </p>
                  </div>
                </div>

                {!item.isCorrect && (item.aiHint || item.hint) && (
                  <HintBox hint={item.aiHint || item.hint || ""} className="mt-3" />
                )}

                <div className="mt-3 text-muted">
                  <p className="text-sm font-semibold text-foreground">Worked steps</p>
                  <WorkedSteps steps={item.explanation} className="mt-1" />
                </div>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
