import { requireRole } from "@/lib/auth/require-role";
import { createClient } from "@/lib/supabase/server";
import { DashboardHeader } from "@/components/dashboard/DashboardHeader";
import { GradeTopicSection } from "@/components/dashboard/GradeTopicSection";
import { GradeSwitch } from "@/components/dashboard/GradeSwitch";
import { EmptyState } from "@/components/ui/EmptyState";
import type { CatalogueTopic } from "@/components/dashboard/TopicCard";
import { loadLearnerContext, parseGrade, DEFAULT_GRADE } from "@/lib/learner/profile";

export default async function LearnerTopicsPage({
  searchParams,
}: {
  searchParams: Promise<{ grade?: string }>;
}) {
  const user = await requireRole("learner");
  const { grade: gradeParam } = await searchParams;

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
        eyebrow="Learner"
        title="Topic catalogue"
        subtitle="Browse the CAPS-aligned algebra topics for your grade and jump into focused practice."
      />

      <GradeSwitch active={grade} basePath="/learner/topics" />

      {error ? (
        <EmptyState
          title="We couldn’t load the topics"
          description="Something went wrong fetching the catalogue. Please refresh to try again."
        />
      ) : topics.length === 0 ? (
        <EmptyState
          title="No topics yet"
          description={`No Grade ${grade} topics are in the catalogue yet. Try the other grade or check back soon.`}
        />
      ) : (
        <GradeTopicSection grade={grade} topics={topics} />
      )}
    </div>
  );
}
