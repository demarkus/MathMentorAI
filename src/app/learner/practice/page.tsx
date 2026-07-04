import { redirect } from "next/navigation";
import { requireRole } from "@/lib/auth/require-role";
import { createClient } from "@/lib/supabase/server";
import { DashboardHeader } from "@/components/dashboard/DashboardHeader";
import { GradeTopicSection } from "@/components/dashboard/GradeTopicSection";
import { GradeSwitch } from "@/components/dashboard/GradeSwitch";
import type { CatalogueTopic } from "@/components/dashboard/TopicCard";
import { loadLearnerContext, parseGrade, DEFAULT_GRADE } from "@/lib/learner/profile";

export default async function PracticeLandingPage({
  searchParams,
}: {
  searchParams: Promise<{ topic?: string; grade?: string }>;
}) {
  const user = await requireRole("learner");
  const { topic, grade: gradeParam } = await searchParams;

  // Preserve legacy deep links (e.g. /learner/practice?topic=slug&grade=9).
  if (topic) {
    redirect(`/learner/practice/${topic}${gradeParam ? `?grade=${gradeParam}` : ""}`);
  }

  const supabase = await createClient();
  // Default to the learner's own grade; an explicit ?grade= switch overrides it.
  const learner = await loadLearnerContext(supabase, user.id);
  const grade = parseGrade(gradeParam) ?? learner?.grade ?? DEFAULT_GRADE;

  const { data, error } = await supabase
    .from("topics")
    .select("id, grade, name, slug, description, display_order")
    .eq("grade", grade)
    .order("display_order", { ascending: true });

  const topics = (data ?? []) as CatalogueTopic[];

  return (
    <div className="space-y-10">
      <DashboardHeader
        eyebrow="Practice"
        title="Choose a topic to practise"
        subtitle="Pick a topic to get a short set of questions with instant feedback and worked explanations."
      />

      <GradeSwitch active={grade} basePath="/learner/practice" />

      {error ? (
        <div className="rounded-2xl border border-line bg-white p-8 text-center">
          <h2 className="text-lg font-semibold">We couldn’t load the topics</h2>
          <p className="mt-2 text-sm text-muted">Something went wrong. Please refresh to try again.</p>
        </div>
      ) : topics.length === 0 ? (
        <div className="rounded-2xl border border-line bg-white p-8 text-center">
          <h2 className="text-lg font-semibold">No topics yet</h2>
          <p className="mt-2 text-sm text-muted">No Grade {grade} practice topics yet. Try the other grade or check back soon.</p>
        </div>
      ) : (
        <GradeTopicSection grade={grade} topics={topics} hrefBase="/learner/practice" cta="Practise topic" />
      )}
    </div>
  );
}
