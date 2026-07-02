import Link from "next/link";
import { RoleHeader } from "@/components/role-header";
import { requireRole } from "@/lib/auth/require-role";
import { DashboardHeader } from "@/components/dashboard/DashboardHeader";
import { DashboardGrid } from "@/components/dashboard/DashboardGrid";
import { ParentReportCard } from "@/components/reports/ParentReportCard";
import { TopicRiskTable } from "@/components/reports/TopicRiskTable";
import { RecommendationList } from "@/components/reports/RecommendationList";

export default async function ParentReportsPage() {
  await requireRole("parent");

  return (
    <>
      <RoleHeader role="parent" />
      <main className="mx-auto max-w-6xl space-y-8 px-5 py-10">
        <Link href="/parent" className="inline-flex items-center gap-1 text-sm font-semibold text-brand hover:underline">
          <span aria-hidden>←</span> Back to dashboard
        </Link>

        <DashboardHeader
          eyebrow="Parent"
          title="Progress reports"
          subtitle="A weekly view of how your learner is doing, once they’re securely connected."
        />

        <p className="rounded-2xl border border-accent/40 bg-accent/10 p-4 text-sm leading-6 text-brand-dark">
          Parent-learner linking is coming soon. Reports will appear here once your learner is securely connected.
        </p>

        <ParentReportCard title="Connect a learner" badge="Coming soon" icon="🔗">
          <p>
            When linking is available, you’ll connect your child by their learner email and they’ll confirm the request.
            This form is a preview and isn’t active yet.
          </p>
          <div className="mt-4 flex flex-col gap-3 sm:flex-row">
            <input
              type="email"
              disabled
              aria-label="Learner email"
              placeholder="learner@example.com"
              className="w-full rounded-xl border border-line bg-background px-4 py-3 text-sm text-foreground outline-none disabled:opacity-70 sm:flex-1"
            />
            <button
              type="button"
              disabled
              className="shrink-0 cursor-not-allowed rounded-xl bg-brand px-5 py-3 text-sm font-semibold text-white opacity-50"
            >
              Send link request
            </button>
          </div>
        </ParentReportCard>

        <DashboardGrid cols={2}>
          <ParentReportCard title="Linked learner" badge="Not linked">
            No learner is connected yet. Once linking is available, your learner will appear here.
          </ParentReportCard>
          <ParentReportCard title="Weekly progress report" badge="Coming soon">
            A weekly summary of scores, attempts, and readiness will appear here for each connected learner.
          </ParentReportCard>
        </DashboardGrid>

        <section>
          <h2 className="text-lg font-semibold">Weak topics</h2>
          <div className="mt-4">
            <TopicRiskTable rows={[]} />
          </div>
        </section>

        <section>
          <h2 className="text-lg font-semibold">Recommended practice</h2>
          <div className="mt-4">
            <RecommendationList items={[]} />
          </div>
        </section>
      </main>
    </>
  );
}
