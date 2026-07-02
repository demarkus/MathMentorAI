import { redirect } from "next/navigation";
import { requireRole } from "@/lib/auth/require-role";
import { createClient } from "@/lib/supabase/server";
import { DashboardHeader } from "@/components/dashboard/DashboardHeader";
import { GradeTopicSection } from "@/components/dashboard/GradeTopicSection";
import type { CatalogueTopic } from "@/components/dashboard/TopicCard";

export default async function PracticeLandingPage({
  searchParams,
}: {
  searchParams: Promise<{ topic?: string; grade?: string }>;
}) {
  await requireRole("learner");
  const { topic, grade } = await searchParams;

  // Preserve legacy deep links (e.g. /learner/practice?topic=slug&grade=9).
  if (topic) {
    redirect(`/learner/practice/${topic}${grade ? `?grade=${grade}` : ""}`);
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("topics")
    .select("id, grade, name, slug, description, display_order")
    .order("grade", { ascending: true })
    .order("display_order", { ascending: true });

  const topics = (data ?? []) as CatalogueTopic[];
  const grades = [...new Set(topics.map((item) => item.grade))].sort((a, b) => a - b);

  return (
    <div className="space-y-10">
      <DashboardHeader
        eyebrow="Practice"
        title="Choose a topic to practise"
        subtitle="Pick a topic to get a short set of questions with instant feedback and worked explanations."
      />

      {error ? (
        <div className="rounded-2xl border border-line bg-white p-8 text-center">
          <h2 className="text-lg font-semibold">We couldn’t load the topics</h2>
          <p className="mt-2 text-sm text-muted">Something went wrong. Please refresh to try again.</p>
        </div>
      ) : topics.length === 0 ? (
        <div className="rounded-2xl border border-line bg-white p-8 text-center">
          <h2 className="text-lg font-semibold">No topics yet</h2>
          <p className="mt-2 text-sm text-muted">Practice topics will appear here once they have been added.</p>
        </div>
      ) : (
        <div className="space-y-10">
          {grades.map((gradeValue) => (
            <GradeTopicSection
              key={gradeValue}
              grade={gradeValue}
              topics={topics.filter((item) => item.grade === gradeValue)}
              hrefBase="/learner/practice"
              cta="Practise topic"
            />
          ))}
        </div>
      )}
    </div>
  );
}
