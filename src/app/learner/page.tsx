import Link from "next/link";
import { requireRole } from "@/lib/auth/require-role";
import { createClient } from "@/lib/supabase/server";
import { loadLearnerProgress } from "@/lib/progress/load-progress";
import { DashboardHeader } from "@/components/dashboard/DashboardHeader";
import { DashboardGrid } from "@/components/dashboard/DashboardGrid";
import { DashboardCard } from "@/components/dashboard/DashboardCard";
import { DashboardActionCard } from "@/components/dashboard/DashboardActionCard";
import { ProgressStatCard } from "@/components/dashboard/ProgressStatCard";

export default async function LearnerPage() {
  const user = await requireRole("learner");
  const firstName = user.profile?.full_name?.split(" ")[0] || "learner";

  const supabase = await createClient();
  const { data: learner } = await supabase
    .from("learner_profiles")
    .select("id")
    .eq("user_id", user.id)
    .maybeSingle();
  const learnerId = (learner as { id: string } | null)?.id;
  const progress = learnerId ? await loadLearnerProgress(supabase, learnerId) : null;
  const hasProgress = Boolean(progress?.hasData);

  return (
    <div className="space-y-10">
      <DashboardHeader
        eyebrow="Learner dashboard"
        title={`Good to see you, ${firstName}.`}
        subtitle="A little focused practice today goes a long way."
      />

      <section>
        <h2 className="text-lg font-semibold">Jump back in</h2>
        <DashboardGrid className="mt-4">
          <DashboardActionCard href="/learner/practice" icon="✏️" title="Continue practice" description="Pick up guided practice with a hint before every full solution." cta="Start practising" />
          <DashboardActionCard href="/learner/diagnostic" icon="🎯" title="Diagnostic test" description="A short check that pinpoints the algebra topics to focus on first." cta="Take the diagnostic" />
          <DashboardActionCard href="/learner/topics" icon="📚" title="Topic catalogue" description="Browse every CAPS-aligned topic for your grade and practise by topic." cta="Browse topics" />
          <DashboardActionCard href="/learner/progress" icon="📈" title="Track progress" description="See your scores, strengths, focus areas, and recent activity." cta="View progress" />
        </DashboardGrid>
      </section>

      <section>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-lg font-semibold">Your progress</h2>
          {hasProgress && (
            <Link href="/learner/progress" className="text-sm font-semibold text-brand hover:underline">
              See full progress →
            </Link>
          )}
        </div>
        {hasProgress && progress ? (
          <DashboardGrid className="mt-4">
            <ProgressStatCard label="Quizzes completed" value={String(progress.totalQuizzes)} note="Diagnostic and practice runs" />
            <ProgressStatCard label="Questions attempted" value={String(progress.totalAttempts)} note="Keep the streak going" />
            <ProgressStatCard
              label="Average score"
              value={`${progress.averageScore}%`}
              note={progress.recommendedTopic ? `Next up: ${progress.recommendedTopic.name}` : "Across your recent work"}
            />
          </DashboardGrid>
        ) : (
          <div className="mt-4">
            <DashboardCard title="Start building your progress">
              Take the diagnostic or practise a topic and your scores, strengths, and focus areas will appear here.{" "}
              <Link href="/learner/progress" className="font-semibold text-brand hover:underline">
                View progress
              </Link>
              .
            </DashboardCard>
          </div>
        )}
      </section>
    </div>
  );
}
