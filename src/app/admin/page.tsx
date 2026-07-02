import { RoleHeader } from "@/components/role-header";
import { requireRole } from "@/lib/auth/require-role";
import { DashboardHeader } from "@/components/dashboard/DashboardHeader";
import { DashboardGrid } from "@/components/dashboard/DashboardGrid";
import { DashboardCard } from "@/components/dashboard/DashboardCard";
import { DashboardActionCard } from "@/components/dashboard/DashboardActionCard";

export default async function AdminPage() {
  const user = await requireRole("admin");
  const firstName = user.profile?.full_name?.split(" ")[0] || "admin";

  return (
    <>
      <RoleHeader role="admin" />
      <main className="mx-auto max-w-6xl space-y-8 px-5 py-10">
        <DashboardHeader
          eyebrow="Admin dashboard"
          title={`Welcome, ${firstName}.`}
          subtitle="Manage the question bank and platform content."
        />

        <DashboardGrid>
          <DashboardCard title="Users" badge="Coming soon">Manage learners, parents, teachers, and admins.</DashboardCard>
          <DashboardActionCard href="/admin/topics" icon="📚" title="Topics" description="Browse the CAPS topic catalogue across grades." cta="View topics" />
          <DashboardActionCard href="/admin/questions" icon="🗂️" title="Question bank" description="Review, add, and curate questions across topics and grades." cta="Manage questions" />
          <DashboardCard title="Reports" badge="Coming soon">Platform-wide usage and performance reporting.</DashboardCard>
          <DashboardCard title="Subscriptions" badge="Coming soon">Billing and plan management. Payments are not enabled yet.</DashboardCard>
        </DashboardGrid>
      </main>
    </>
  );
}
