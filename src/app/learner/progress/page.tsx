import Link from "next/link";
import { requireRole } from "@/lib/auth/require-role";
import { createClient } from "@/lib/supabase/server";
import { loadLearnerProgress, type LearnerProgress } from "@/lib/progress/load-progress";
import { DashboardHeader } from "@/components/dashboard/DashboardHeader";
import { DashboardGrid } from "@/components/dashboard/DashboardGrid";
import { DashboardCard } from "@/components/dashboard/DashboardCard";
import { ProgressStatCard } from "@/components/dashboard/ProgressStatCard";
import { TopicPerformanceTable } from "@/components/dashboard/TopicPerformanceTable";
import { RecentActivityList } from "@/components/dashboard/RecentActivityList";

function EmptyState() {
  return (
    <div className="space-y-6">
      <DashboardHeader
        eyebrow="Learner"
        title="Your progress"
        subtitle="Track your scores, strengths, and focus areas as you practise."
      />
      <div className="rounded-2xl border border-line bg-white p-8 text-center">
        <h2 className="text-lg font-semibold">Nothing to track yet</h2>
        <p className="mt-2 text-sm text-muted">
          Take the diagnostic or practise a topic and your progress will start building here.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <Link href="/learner/diagnostic" className="rounded-xl bg-brand px-5 py-3 font-semibold text-white hover:bg-brand-dark">
            Take the diagnostic
          </Link>
          <Link href="/learner/practice" className="rounded-xl border border-line px-5 py-3 font-semibold hover:border-brand/40">
            Practise a topic
          </Link>
        </div>
      </div>
    </div>
  );
}

function ProgressView({ progress }: { progress: LearnerProgress }) {
  const { averageBasis, totalQuizzes } = progress;
  const averageNote =
    averageBasis === "quiz"
      ? `Across ${totalQuizzes} completed quiz${totalQuizzes === 1 ? "" : "zes"}`
      : "Based on your answers so far";

  return (
    <div className="space-y-10">
      <DashboardHeader
        eyebrow="Learner"
        title="Your progress"
        subtitle="Track your scores, strengths, and focus areas as you practise."
      />

      <DashboardGrid>
        <ProgressStatCard label="Quizzes completed" value={String(progress.totalQuizzes)} note="Diagnostic and practice runs" />
        <ProgressStatCard label="Questions attempted" value={String(progress.totalAttempts)} note="Every attempt sharpens your path" />
        <ProgressStatCard label="Average score" value={`${progress.averageScore}%`} note={averageNote} />
      </DashboardGrid>

      <section className="grid gap-4 lg:grid-cols-2">
        {progress.recommendedTopic ? (
          <Link
            href={`/learner/practice/${progress.recommendedTopic.slug}?grade=${progress.recommendedTopic.grade}`}
            className="group flex h-full flex-col rounded-2xl border border-line bg-white p-6 hover:-translate-y-0.5 hover:border-brand/40"
          >
            <p className="text-xs font-semibold uppercase tracking-wide text-brand">Recommended next</p>
            <h3 className="mt-1 text-lg font-semibold">{progress.recommendedTopic.name}</h3>
            <p className="mt-2 text-sm text-muted">
              Grade {progress.recommendedTopic.grade} · a focused practice set to lift your weakest area.
            </p>
            <span className="mt-auto inline-flex items-center gap-1 pt-4 text-sm font-semibold text-brand group-hover:gap-2">
              Practise this topic <span aria-hidden>→</span>
            </span>
          </Link>
        ) : (
          <DashboardCard title="Recommended next">Practise a topic to get a personalised recommendation.</DashboardCard>
        )}

        {progress.latestDiagnostic ? (
          <DashboardCard title="Latest diagnostic">
            <p className="font-mono text-3xl font-semibold text-foreground">{progress.latestDiagnostic.percentage}%</p>
            <p className="mt-1">
              {progress.latestDiagnostic.correct} of {progress.latestDiagnostic.totalQuestions} correct.
            </p>
            {progress.latestDiagnostic.weakTopics.length > 0 && (
              <p className="mt-2">Focus: {progress.latestDiagnostic.weakTopics.slice(0, 3).join(", ")}.</p>
            )}
          </DashboardCard>
        ) : (
          <DashboardCard title="Latest diagnostic">
            No diagnostic on record yet.{" "}
            <Link href="/learner/diagnostic" className="font-semibold text-brand hover:underline">
              Take the diagnostic
            </Link>
            .
          </DashboardCard>
        )}
      </section>

      <section className="grid gap-4 sm:grid-cols-2">
        <DashboardCard title="Strengths">
          {progress.strongTopics.length > 0 ? (
            <>
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-brand">Good progress</p>
              <ul className="space-y-1">
                {progress.strongTopics.slice(0, 5).map((topic) => (
                  <li key={topic.topicId}>
                    ✓ {topic.topic} <span className="font-mono text-xs">({topic.percentage}%)</span>
                  </li>
                ))}
              </ul>
            </>
          ) : (
            "Keep practising to build clear strengths."
          )}
        </DashboardCard>
        <DashboardCard title="Focus areas">
          {progress.weakTopics.length > 0 ? (
            <>
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-amber-700">Focus here next</p>
              <ul className="space-y-1">
                {progress.weakTopics.slice(0, 5).map((topic) => (
                  <li key={topic.topicId}>
                    • {topic.topic} <span className="font-mono text-xs">({topic.percentage}%)</span>
                  </li>
                ))}
              </ul>
            </>
          ) : (
            "No major gaps yet — nice work!"
          )}
        </DashboardCard>
      </section>

      <section>
        <h2 className="text-lg font-semibold">Topic performance</h2>
        <div className="mt-4">
          <TopicPerformanceTable rows={progress.topicPerformance} />
        </div>
      </section>

      <section>
        <h2 className="text-lg font-semibold">Recent activity</h2>
        <div className="mt-4">
          <RecentActivityList items={progress.recentActivity} />
        </div>
      </section>
    </div>
  );
}

export default async function LearnerProgressPage() {
  const user = await requireRole("learner");
  const supabase = await createClient();

  const { data: learner } = await supabase
    .from("learner_profiles")
    .select("id")
    .eq("user_id", user.id)
    .maybeSingle();
  const learnerId = (learner as { id: string } | null)?.id;

  if (!learnerId) return <EmptyState />;

  const progress = await loadLearnerProgress(supabase, learnerId);

  if (progress.error) {
    return (
      <div className="space-y-6">
        <DashboardHeader eyebrow="Learner" title="Your progress" />
        <div className="rounded-2xl border border-line bg-white p-8 text-center">
          <h2 className="text-lg font-semibold">We couldn’t load your progress</h2>
          <p className="mt-2 text-sm text-muted">Something went wrong fetching your data. Please refresh to try again.</p>
        </div>
      </div>
    );
  }

  if (!progress.hasData) return <EmptyState />;

  return <ProgressView progress={progress} />;
}
