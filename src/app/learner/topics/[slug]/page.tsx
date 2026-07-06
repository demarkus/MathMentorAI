import Link from "next/link";
import { notFound } from "next/navigation";
import { requireRole } from "@/lib/auth/require-role";
import { createClient } from "@/lib/supabase/server";
import { loadLearnerContext } from "@/lib/learner/profile";
import { loadLearnerProgress } from "@/lib/progress/load-progress";
import {
  WEAK_TOPIC_THRESHOLD,
  STRONG_TOPIC_THRESHOLD,
  type TopicPerformance,
} from "@/lib/math/progress";
import { DashboardHeader } from "@/components/dashboard/DashboardHeader";
import { DashboardGrid } from "@/components/dashboard/DashboardGrid";
import { DashboardCard } from "@/components/dashboard/DashboardCard";
import { TopicCard, type CatalogueTopic } from "@/components/dashboard/TopicCard";
import { Badge, type BadgeTone } from "@/components/ui/Badge";

const VALID_GRADES = [9, 10];

/** Maps topic accuracy to a mastery pill, using the shared weak/strong thresholds. */
function masteryBadge(percentage: number): { label: string; tone: BadgeTone } {
  if (percentage >= STRONG_TOPIC_THRESHOLD) return { label: "Strong", tone: "success" };
  if (percentage >= WEAK_TOPIC_THRESHOLD) return { label: "Developing", tone: "brand" };
  return { label: "Needs practice", tone: "warning" };
}

/** The learner's mastery for this topic, rendered inside the progress card. */
function TopicMastery({ performance }: { performance: TopicPerformance | undefined }) {
  if (!performance || performance.attempts === 0) {
    return (
      <>
        You haven’t practised this topic yet. Start a practice run and your accuracy and mastery will appear here.
      </>
    );
  }
  const badge = masteryBadge(performance.percentage);
  return (
    <div>
      <div className="flex items-center gap-3">
        <p className="font-mono text-3xl font-semibold text-foreground">{performance.percentage}%</p>
        <Badge tone={badge.tone}>{badge.label}</Badge>
      </div>
      <p className="mt-1">
        {performance.correct} of {performance.attempts} recent question{performance.attempts === 1 ? "" : "s"} correct.
      </p>
    </div>
  );
}

function BackLink() {
  return (
    <Link href="/learner/topics" className="inline-flex items-center gap-1 text-sm font-semibold text-brand hover:underline">
      <span aria-hidden>←</span> All topics
    </Link>
  );
}

export default async function TopicDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ grade?: string }>;
}) {
  const user = await requireRole("learner");
  const { slug } = await params;
  const { grade } = await searchParams;

  const supabase = await createClient();
  let query = supabase
    .from("topics")
    .select("id, grade, name, slug, description, display_order")
    .eq("slug", slug)
    .order("grade", { ascending: true });

  const gradeNum = grade ? Number(grade) : undefined;
  if (gradeNum && VALID_GRADES.includes(gradeNum)) query = query.eq("grade", gradeNum);

  const { data, error } = await query;

  if (error) {
    return (
      <div className="space-y-8">
        <BackLink />
        <div className="rounded-2xl border border-line bg-white p-8 text-center">
          <h2 className="text-lg font-semibold">We couldn’t load this topic</h2>
          <p className="mt-2 text-sm text-muted">Please go back to the catalogue and try again.</p>
        </div>
      </div>
    );
  }

  const topics = (data ?? []) as CatalogueTopic[];
  if (topics.length === 0) notFound();

  // The same slug can exist in more than one grade. If a specific grade wasn't
  // requested (or matched), let the learner choose which grade variant to open.
  if (topics.length > 1) {
    return (
      <div className="space-y-8">
        <BackLink />
        <DashboardHeader
          eyebrow="Topic catalogue"
          title={topics[0].name}
          subtitle="This topic is offered in more than one grade. Choose the grade you want to explore."
        />
        <DashboardGrid cols={2}>
          {topics.map((topic) => (
            <TopicCard key={topic.id} topic={topic} />
          ))}
        </DashboardGrid>
      </div>
    );
  }

  const topic = topics[0];
  const { count } = await supabase
    .from("questions")
    .select("id", { count: "exact", head: true })
    .eq("topic_id", topic.id)
    .eq("is_active", true);
  const questionCount = count ?? 0;
  const practiceHref = `/learner/practice/${topic.slug}?grade=${topic.grade}`;

  // This topic's slice of the learner's existing progress data (bounded recent
  // window, same numbers as /learner/progress). No learner profile yet (or a
  // load error) simply renders the not-practised-yet state.
  const learner = await loadLearnerContext(supabase, user.id);
  const progress = learner ? await loadLearnerProgress(supabase, learner.id, topic.grade) : null;
  const performance =
    progress && !progress.error
      ? progress.topicPerformance.find((entry) => entry.topicId === topic.id)
      : undefined;

  return (
    <div className="space-y-8">
      <BackLink />
      <DashboardHeader
        eyebrow={`Grade ${topic.grade} · Topic ${topic.display_order}`}
        title={topic.name}
        subtitle={topic.description}
        action={
          <Link href={practiceHref} className="rounded-xl bg-brand px-5 py-3 font-semibold text-white hover:bg-brand-dark">
            Start practice
          </Link>
        }
      />

      <DashboardGrid cols={3}>
        <DashboardCard title="Active questions">
          <p className="font-mono text-3xl font-semibold text-foreground">{questionCount}</p>
          <p className="mt-1">question{questionCount === 1 ? "" : "s"} ready to practise for this topic.</p>
        </DashboardCard>
        <DashboardCard title="Diagnostic relevance">
          This topic feeds the diagnostic that maps your strengths and gaps.{" "}
          {questionCount === 0
            ? "No questions are available for the diagnostic here yet."
            : "Practising here sharpens your diagnostic accuracy for this topic."}
        </DashboardCard>
        <DashboardCard title="Your progress">
          <TopicMastery performance={performance} />
        </DashboardCard>
      </DashboardGrid>
    </div>
  );
}
