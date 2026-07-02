import Link from "next/link";
import { RoleHeader } from "@/components/role-header";
import { requireRole } from "@/lib/auth/require-role";
import { DashboardHeader } from "@/components/dashboard/DashboardHeader";

// Security: secure parent-learner linking is not implemented, so this route
// intentionally ignores the [learnerId] param and never queries learner data.
// It only confirms the parent role and shows an access message.
export default async function ParentLearnerReportPage() {
  await requireRole("parent");

  return (
    <>
      <RoleHeader role="parent" />
      <main className="mx-auto max-w-3xl space-y-8 px-5 py-10">
        <Link href="/parent/reports" className="inline-flex items-center gap-1 text-sm font-semibold text-brand hover:underline">
          <span aria-hidden>←</span> Back to reports
        </Link>

        <DashboardHeader eyebrow="Parent" title="Learner report" />

        <div className="rounded-2xl border border-line bg-white p-8 text-center">
          <span className="mx-auto grid size-12 place-items-center rounded-full bg-brand/10 text-2xl">🔒</span>
          <h2 className="mt-4 text-lg font-semibold">Secure linking required</h2>
          <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-muted">
            Secure parent-learner linking is required before viewing individual learner reports.
          </p>
          <Link
            href="/parent/reports"
            className="mt-6 inline-flex rounded-xl bg-brand px-5 py-3 font-semibold text-white hover:bg-brand-dark"
          >
            Back to reports
          </Link>
        </div>
      </main>
    </>
  );
}
