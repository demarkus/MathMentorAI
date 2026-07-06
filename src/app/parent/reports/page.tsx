import Link from "next/link";
import { RoleHeader } from "@/components/role-header";
import { requireRole } from "@/lib/auth/require-role";
import { createClient } from "@/lib/supabase/server";
import { DashboardHeader } from "@/components/dashboard/DashboardHeader";
import { DashboardGrid } from "@/components/dashboard/DashboardGrid";
import { ParentReportCard } from "@/components/reports/ParentReportCard";
import { InviteLearnerForm } from "@/components/reports/InviteLearnerForm";
import { RemoveLinkButton } from "@/components/reports/RemoveLinkButton";
import { inviteLearner, removeLearnerLink } from "./actions";

type LinkRow = {
  id: string;
  learner_email: string;
  learner_id: string | null;
  status: "pending" | "accepted" | "rejected";
  created_at: string;
};

export default async function ParentReportsPage() {
  const user = await requireRole("parent");

  // The parent's own links only — enforced by RLS, not just this filter.
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("parent_learner_links")
    .select("id, learner_email, learner_id, status, created_at")
    .eq("parent_id", user.id)
    .order("created_at", { ascending: false });

  const links = (data ?? []) as LinkRow[];
  const accepted = links.filter((link) => link.status === "accepted");
  const pending = links.filter((link) => link.status === "pending");
  const rejected = links.filter((link) => link.status === "rejected");

  // Accepted links point at profiles; reports are keyed by learner_profiles.id.
  // RLS only exposes the learner profiles of accepted links, so this lookup
  // doubles as the authorization check for the report URLs rendered below.
  const learnerProfileByUser = new Map<string, string>();
  const acceptedUserIds = accepted.map((link) => link.learner_id).filter((id): id is string => Boolean(id));
  if (acceptedUserIds.length > 0) {
    const { data: learnerProfiles } = await supabase
      .from("learner_profiles")
      .select("id, user_id")
      .in("user_id", acceptedUserIds);
    for (const row of (learnerProfiles ?? []) as { id: string; user_id: string }[]) {
      learnerProfileByUser.set(row.user_id, row.id);
    }
  }

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
          subtitle="Connect your learner by email — once they accept, their progress reports appear here."
        />

        {error && (
          <p className="rounded-2xl border border-line bg-white p-4 text-sm leading-6 text-muted">
            We couldn’t load your learner links just now. Please refresh to try again.
          </p>
        )}

        <ParentReportCard title="Connect a learner" icon="🔗">
          <p>
            Enter your child’s learner email and they’ll confirm the request from their dashboard. Reports unlock only
            after they accept.
          </p>
          <div className="mt-4">
            <InviteLearnerForm inviteAction={inviteLearner} />
          </div>
        </ParentReportCard>

        <DashboardGrid cols={2}>
          <ParentReportCard title="Linked learners" badge={accepted.length > 0 ? `${accepted.length} active` : "None yet"}>
            {accepted.length === 0 ? (
              <>No learner is connected yet. Send a link request above and ask your learner to accept it.</>
            ) : (
              <ul className="space-y-3">
                {accepted.map((link) => {
                  const learnerProfileId = link.learner_id ? learnerProfileByUser.get(link.learner_id) : undefined;
                  return (
                    <li key={link.id} className="flex flex-wrap items-center justify-between gap-3">
                      <span className="min-w-0">
                        <span className="block truncate font-medium text-foreground">{link.learner_email}</span>
                        {learnerProfileId ? (
                          <Link
                            href={`/parent/reports/${learnerProfileId}`}
                            className="text-sm font-semibold text-brand hover:underline"
                          >
                            View report →
                          </Link>
                        ) : (
                          <span className="text-xs text-muted">Waiting for the learner to finish onboarding.</span>
                        )}
                      </span>
                      <RemoveLinkButton linkId={link.id} removeAction={removeLearnerLink} />
                    </li>
                  );
                })}
              </ul>
            )}
          </ParentReportCard>

          <ParentReportCard title="Active invitations" badge={pending.length > 0 ? `${pending.length} pending` : "None"}>
            {pending.length === 0 ? (
              <>No invitations are waiting. Requests you send appear here until your learner responds.</>
            ) : (
              <ul className="space-y-3">
                {pending.map((link) => (
                  <li key={link.id} className="flex flex-wrap items-center justify-between gap-3">
                    <span className="min-w-0">
                      <span className="block truncate font-medium text-foreground">{link.learner_email}</span>
                      <span className="text-xs text-muted">
                        Sent {new Date(link.created_at).toLocaleDateString()} · awaiting learner approval
                      </span>
                    </span>
                    <RemoveLinkButton linkId={link.id} removeAction={removeLearnerLink} />
                  </li>
                ))}
              </ul>
            )}
          </ParentReportCard>
        </DashboardGrid>

        {rejected.length > 0 && (
          <ParentReportCard title="Declined requests" badge={String(rejected.length)}>
            <ul className="space-y-3">
              {rejected.map((link) => (
                <li key={link.id} className="flex flex-wrap items-center justify-between gap-3">
                  <span className="min-w-0">
                    <span className="block truncate font-medium text-foreground">{link.learner_email}</span>
                    <span className="text-xs text-muted">The learner declined this request. Remove it to send a new one.</span>
                  </span>
                  <RemoveLinkButton linkId={link.id} removeAction={removeLearnerLink} />
                </li>
              ))}
            </ul>
          </ParentReportCard>
        )}
      </main>
    </>
  );
}
