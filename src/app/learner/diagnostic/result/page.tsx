import Link from "next/link";
import { requireRole } from "@/lib/auth/require-role";
import { createClient } from "@/lib/supabase/server";
import { QuizResultSummary } from "@/components/quiz/QuizResultSummary";
import { EmptyState } from "@/components/ui/EmptyState";
import { decodeSummary, isDiagnosticSummary, type DiagnosticSummary } from "@/lib/math/diagnostic";

/** Loads a persisted diagnostic report the learner owns (RLS-scoped). */
async function loadReport(reportId: string): Promise<DiagnosticSummary | null> {
  const supabase = await createClient();
  const { data, error } = await supabase.from("reports").select("data").eq("id", reportId).maybeSingle();
  if (error || !data) return null;
  const payload = (data as { data: unknown }).data;
  return isDiagnosticSummary(payload) ? payload : null;
}

export default async function DiagnosticResultPage({
  searchParams,
}: {
  searchParams: Promise<{ report?: string; data?: string }>;
}) {
  await requireRole("learner");
  const { report, data } = await searchParams;

  let summary: DiagnosticSummary | null = null;
  if (report) summary = await loadReport(report);
  if (!summary && data) summary = decodeSummary(data);

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
