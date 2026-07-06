import Link from "next/link";
import { RoleHeader } from "@/components/role-header";
import { requireRole } from "@/lib/auth/require-role";
import { createClient } from "@/lib/supabase/server";
import { loadLearnerProgress } from "@/lib/progress/load-progress";
import { isValidGrade } from "@/lib/learner/profile";
import { DashboardHeader } from "@/components/dashboard/DashboardHeader";
import { DashboardGrid } from "@/components/dashboard/DashboardGrid";
import { ProgressStatCard } from "@/components/dashboard/ProgressStatCard";
import { TopicRiskTable, type TopicRiskRow } from "@/components/reports/TopicRiskTable";
import { RecommendationList, type RecommendationItem } from "@/components/reports/RecommendationList";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function AccessDenied() {
  return (
    <>
      <RoleHeader role="parent" />
      <main className="mx-auto max-w-3xl space-y-8 px-5 py-10">
        <Link href="/parent/reports" className="inline-flex items-center gap-1 text-sm font-semibold text-brand hover:underline">
          <span aria-hidden>←</span> Back to reports
        </Link>

        <DashboardHeader eyebrow="Parent" title="Learner report" />

        <div className="rounded-2xl border border-line bg-white p-8 text-center">
          <span className="mx-auto grid size-12 place-items-center rounded-full bg-brand/10 text-2xl">🔒</span>
          <h2 className="mt-4 text-lg font-semibold">This report isn’t available</h2>
          <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-muted">
            You can only view reports for learners who have accepted your link request. Send or check a request from
            the reports page.
          </p>
          <Link
            href="/parent/reports"
            className="mt-6 inline-flex rounded-xl bg-brand px-5 py-3 font-semibold text-white hover:bg-brand-dark"
          >
            Back to reports
          </Link>
        </div>
      </main>
    </>
  );
}

export default async function ParentLearnerReportPage({
  params,
}: {
  params: Promise<{ learnerId: string }>;
}) {
  const user = await requireRole("parent");
  const { learnerId } = await params;
  if (!UUID_RE.test(learnerId)) return <AccessDenied />;

  // Authorization is verified server-side twice over: this query runs under the
  // parent's session, where RLS only exposes learner_profiles rows covered by
  // an ACCEPTED parent_learner_links row for this parent…
  const supabase = await createClient();
  const { data: learnerRow } = await supabase
    .from("learner_profiles")
    .select("id, user_id, grade")
    .eq("id", learnerId)
    .maybeSingle();
  const learner = learnerRow as { id: string; user_id: string; grade: number | null } | null;
  if (!learner) return <AccessDenied />;

  // …and the accepted link is then re-checked explicitly (defense in depth),
  // which also gives us the learner's email for the header.
  const { data: linkRow } = await supabase
    .from("parent_learner_links")
    .select("id, learner_email")
    .eq("parent_id", user.id)
    .eq("learner_id", learner.user_id)
    .eq("status", "accepted")
    .maybeSingle();
  const link = linkRow as { id: string; learner_email: string } | null;
  if (!link) return <AccessDenied />;

  const grade = isValidGrade(learner.grade) ? learner.grade : undefined;
  const progress = await loadLearnerProgress(supabase, learner.id, grade);

  const riskRows: TopicRiskRow[] = progress.weakTopics.map((topic) => ({
    topic: topic.topic,
    grade: topic.grade,
    risk: `${topic.percentage}% accuracy`,
  }));

  const recommendations: RecommendationItem[] = progress.recommendedTopic
    ? [
        {
          title: `Practise ${progress.recommendedTopic.name} (Grade ${progress.recommendedTopic.grade})`,
          description: "Recommended next based on recent practice history.",
        },
      ]
    : [];
  // A within-topic split (routine mechanics strong, applied/hard questions
  // weak) gives parents a sharper pointer than the topic name alone.
  if (progress.recommendedTopic && progress.recommendationFocus) {
    const focus = progress.recommendationFocus;
    const weakKind = focus.basis === "cognitive" ? "applied problem-solving questions" : "harder questions";
    recommendations.push({
      title: `Target ${weakKind} in ${progress.recommendedTopic.name}`,
      description:
        `Routine questions are strong (${focus.easierAccuracy}% accuracy) but ` +
        `${weakKind} sit at ${focus.hardAccuracy}% — focused practice there will help most.`,
    });
  }

  return (
    <>
      <RoleHeader role="parent" />
      <main className="mx-auto max-w-6xl space-y-8 px-5 py-10">
        <Link href="/parent/reports" className="inline-flex items-center gap-1 text-sm font-semibold text-brand hover:underline">
          <span aria-hidden>←</span> Back to reports
        </Link>

        <DashboardHeader
          eyebrow="Parent"
          title="Learner report"
          subtitle={grade ? `Progress for ${link.learner_email} · Grade ${grade}.` : `Progress for ${link.learner_email}.`}
        />

        {progress.error ? (
          <p className="rounded-2xl border border-line bg-white p-4 text-sm leading-6 text-muted">
            We couldn’t load this learner’s progress just now. Please refresh to try again.
          </p>
        ) : !progress.hasData ? (
          <p className="rounded-2xl border border-accent/40 bg-accent/10 p-4 text-sm leading-6 text-brand-dark">
            Your learner hasn’t completed any quizzes yet. Their scores, weak topics, and recommendations will appear
            here after their first diagnostic or practice run.
          </p>
        ) : (
          <DashboardGrid cols={3}>
            <ProgressStatCard label="Quizzes completed" value={String(progress.totalQuizzes)} note="Diagnostic and practice runs" />
            <ProgressStatCard label="Questions attempted" value={String(progress.totalAttempts)} note="Across all sessions" />
            <ProgressStatCard
              label="Average score"
              value={`${progress.averageScore}%`}
              note={progress.averageBasis === "quiz" ? "Across completed quizzes" : "Across all attempts"}
            />
          </DashboardGrid>
        )}

        <section>
          <h2 className="text-lg font-semibold">Weak topics</h2>
          <div className="mt-4">
            <TopicRiskTable
              rows={riskRows}
              emptyMessage="No weak topics right now — recent practice looks solid. New risks appear here as your learner works."
            />
          </div>
        </section>

        <section>
          <h2 className="text-lg font-semibold">Recommended practice</h2>
          <div className="mt-4">
            <RecommendationList
              items={recommendations}
              emptyMessage="Personalised recommendations will appear once your learner has attempted a few quizzes."
            />
          </div>
        </section>
      </main>
    </>
  );
}
