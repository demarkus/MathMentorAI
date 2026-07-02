import Link from "next/link";
import { notFound } from "next/navigation";
import { requireRole } from "@/lib/auth/require-role";
import { createClient } from "@/lib/supabase/server";
import { DashboardHeader } from "@/components/dashboard/DashboardHeader";
import { DashboardGrid } from "@/components/dashboard/DashboardGrid";
import { DashboardCard } from "@/components/dashboard/DashboardCard";
import { TopicCard, type CatalogueTopic } from "@/components/dashboard/TopicCard";

const VALID_GRADES = [9, 10];

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
  await requireRole("learner");
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
        <DashboardCard title="Your progress" badge="Coming soon">
          Your mastery and recent attempts for this topic will appear here.
        </DashboardCard>
      </DashboardGrid>
    </div>
  );
}
