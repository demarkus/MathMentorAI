"use client";

import { useState, useTransition } from "react";
import { Alert } from "@/components/ui/Alert";
import type { InvitationActionResult } from "@/app/learner/actions";

export type PendingInvitation = {
  id: string;
  createdAt: string;
};

/**
 * Banner listing pending parent link requests on the learner dashboard, with
 * Accept / Reject per invitation. Accepting shares the learner's progress
 * reports (read-only) with the requesting parent; the decision is enforced
 * server-side by RLS — this component only collects it.
 */
export function InvitationBanner({
  invitations,
  respondAction,
}: {
  invitations: PendingInvitation[];
  respondAction: (linkId: string, accept: boolean) => Promise<InvitationActionResult>;
}) {
  const [error, setError] = useState<string | null>(null);
  const [decided, setDecided] = useState<Record<string, "accepted" | "rejected">>({});
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  if (invitations.length === 0) return null;

  function respond(id: string, accept: boolean) {
    if (pendingId) return;
    setError(null);
    setPendingId(id);
    startTransition(async () => {
      const result = await respondAction(id, accept);
      if (result?.ok) {
        setDecided((current) => ({ ...current, [id]: accept ? "accepted" : "rejected" }));
      } else {
        setError(result?.error ?? "Something went wrong. Please try again.");
      }
      setPendingId(null);
    });
  }

  return (
    <section aria-label="Parent link requests" className="rounded-2xl border border-accent/40 bg-accent/10 p-5">
      <h2 className="text-base font-semibold">A parent wants to follow your progress</h2>
      <p className="mt-1 text-sm leading-6 text-muted">
        Accepting shares your scores and progress reports (read-only) with the parent who sent the request. You can
        only respond to requests sent to your email address.
      </p>
      <ul className="mt-4 space-y-3">
        {invitations.map((invitation) => {
          const decision = decided[invitation.id];
          return (
            <li
              key={invitation.id}
              className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-line bg-white px-4 py-3"
            >
              <span className="text-sm">
                Parent link request ·{" "}
                <span className="text-muted">sent {new Date(invitation.createdAt).toLocaleDateString()}</span>
              </span>
              {decision ? (
                <span className="text-sm font-semibold">{decision === "accepted" ? "Accepted ✓" : "Rejected"}</span>
              ) : (
                <span className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => respond(invitation.id, true)}
                    disabled={pendingId !== null}
                    className="rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white hover:bg-brand-dark disabled:opacity-50"
                  >
                    {pendingId === invitation.id ? "Saving…" : "Accept"}
                  </button>
                  <button
                    type="button"
                    onClick={() => respond(invitation.id, false)}
                    disabled={pendingId !== null}
                    className="rounded-lg border border-line px-4 py-2 text-sm font-semibold hover:border-red-300 hover:text-red-700 disabled:opacity-50"
                  >
                    Reject
                  </button>
                </span>
              )}
            </li>
          );
        })}
      </ul>
      {error && (
        <Alert variant="error" className="mt-3">
          {error}
        </Alert>
      )}
    </section>
  );
}
