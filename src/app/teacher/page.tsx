import { RoleHeader } from "@/components/role-header";
import { requireRole } from "@/lib/auth/require-role";
import { DashboardHeader } from "@/components/dashboard/DashboardHeader";
import { DashboardGrid } from "@/components/dashboard/DashboardGrid";
import { DashboardCard } from "@/components/dashboard/DashboardCard";
import { DashboardActionCard } from "@/components/dashboard/DashboardActionCard";

export default async function TeacherPage() {
  const user = await requireRole("teacher");
  const firstName = user.profile?.full_name?.split(" ")[0] || "teacher";

  return (
    <>
      <RoleHeader role="teacher" />
      <main className="mx-auto max-w-6xl space-y-8 px-5 py-10">
        <DashboardHeader
          eyebrow="Teacher dashboard"
          title={`Welcome, ${firstName}.`}
          subtitle="Prepare CAPS-aligned resources and support your learners."
        />

        <DashboardGrid cols={2}>
          <DashboardActionCard href="/teacher/generator" icon="🧮" title="Worksheet generator" description="Generate worksheets, tests, memos, and revision packs by topic and grade." cta="Open generator" />
          <DashboardActionCard href="/teacher/resources" icon="🗂️" title="My resources" description="Open, re-print, and re-use the worksheets and memos you’ve generated." cta="View resources" />
          <DashboardCard title="Grade & topic selector" badge="Coming soon">Choose a grade and topic to tailor the resources you generate.</DashboardCard>
          <DashboardCard title="Class insights" badge="Coming soon">Aggregate performance across your learners once classes are linked.</DashboardCard>
        </DashboardGrid>
      </main>
    </>
  );
}
