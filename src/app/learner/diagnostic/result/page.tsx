import Link from "next/link";
import { requireRole } from "@/lib/auth/require-role";
import { createClient } from "@/lib/supabase/server";
import { QuizResultSummary } from "@/components/quiz/QuizResultSummary";
import { EmptyState } from "@/components/ui/EmptyState";
import { isDiagnosticSummary, type DiagnosticSummary } from "@/lib/math/diagnostic";

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

  return (
    <div className="mx-auto max-w-3xl">
      <QuizResultSummary summary={summary} />
    </div>
  );
}
