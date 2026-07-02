import { requireRole } from "@/lib/auth/require-role";
import { createClient } from "@/lib/supabase/server";
import { DashboardHeader } from "@/components/dashboard/DashboardHeader";
import { GradeTopicSection } from "@/components/dashboard/GradeTopicSection";
import { EmptyState } from "@/components/ui/EmptyState";
import type { CatalogueTopic } from "@/components/dashboard/TopicCard";

export default async function LearnerTopicsPage() {
  await requireRole("learner");

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("topics")
    .select("id, grade, name, slug, description, display_order")
    .order("grade", { ascending: true })
    .order("display_order", { ascending: true });

  const topics = (data ?? []) as CatalogueTopic[];
  const grades = [...new Set(topics.map((topic) => topic.grade))].sort((a, b) => a - b);

  return (
    <div className="space-y-10">
      <DashboardHeader
        eyebrow="Learner"
        title="Topic catalogue"
        subtitle="Browse the CAPS-aligned algebra topics and jump into focused practice."
      />

      {error ? (
        <EmptyState
          title="We couldn’t load the topics"
          description="Something went wrong fetching the catalogue. Please refresh to try again."
        />
      ) : topics.length === 0 ? (
        <EmptyState
          title="No topics yet"
          description="Topics will appear here once they have been added to the catalogue."
        />
      ) : (
        <div className="space-y-10">
          {grades.map((grade) => (
            <GradeTopicSection key={grade} grade={grade} topics={topics.filter((topic) => topic.grade === grade)} />
          ))}
        </div>
      )}
    </div>
  );
}
