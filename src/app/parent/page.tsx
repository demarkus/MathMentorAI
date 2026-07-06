import { RoleHeader } from "@/components/role-header";
import { requireRole } from "@/lib/auth/require-role";
import { DashboardHeader } from "@/components/dashboard/DashboardHeader";
import { DashboardGrid } from "@/components/dashboard/DashboardGrid";
import { DashboardCard } from "@/components/dashboard/DashboardCard";
import { DashboardActionCard } from "@/components/dashboard/DashboardActionCard";

export default async function ParentPage() {
  const user = await requireRole("parent");
  const firstName = user.profile?.full_name?.split(" ")[0] || "parent";

  return (
    <>
      <RoleHeader role="parent" />
      <main className="mx-auto max-w-6xl space-y-8 px-5 py-10">
        <DashboardHeader
          eyebrow="Parent dashboard"
          title={`Welcome, ${firstName}.`}
          subtitle="Follow your learner’s progress and see which topics need attention."
        />

        <DashboardGrid cols={2}>
          <DashboardActionCard href="/parent/reports" icon="🔗" title="Connect a learner" description="Send a link request to your child’s learner email — they confirm it from their dashboard." cta="Manage learner links" />
          <DashboardActionCard href="/parent/reports" icon="📊" title="Progress reports" description="Topic-by-topic accuracy and readiness for each linked learner." cta="View reports" />
          <DashboardCard title="Weak topics">Each linked learner’s report highlights the topics they struggle with most.</DashboardCard>
          <DashboardCard title="Recommended practice">Reports include suggested practice tailored to your learner’s gaps.</DashboardCard>
        </DashboardGrid>
      </main>
    </>
  );
}
