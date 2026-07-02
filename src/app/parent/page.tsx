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

        <p className="rounded-2xl border border-accent/40 bg-accent/10 p-4 text-sm leading-6 text-brand-dark">
          Parent–learner linking isn’t active yet. Once it’s available you’ll be able to connect your child’s account and
          see their progress here.
        </p>

        <DashboardGrid cols={2}>
          <DashboardCard title="Linked learner" badge="Not linked">Connect a learner account to follow their progress. Account linking is coming soon.</DashboardCard>
          <DashboardActionCard href="/parent/reports" icon="📊" title="Weekly progress report" description="Topic-by-topic accuracy and readiness for each linked learner." cta="View reports" />
          <DashboardCard title="Weak topics" badge="Coming soon">The topics your learner struggles with most will surface here once linking is active.</DashboardCard>
          <DashboardCard title="Recommended practice" badge="Coming soon">Suggested practice sets tailored to your learner’s gaps.</DashboardCard>
        </DashboardGrid>
      </main>
    </>
  );
}
