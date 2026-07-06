"use client";

import { useState, useTransition } from "react";
import { Alert } from "@/components/ui/Alert";
import type { LinkActionResult } from "@/app/parent/reports/actions";

/**
 * Email form a parent uses to send a learner link request. The Server Action
 * arrives as a prop (validated + RLS-enforced server-side); this component only
 * handles input state, pending state, and feedback.
 */
export function InviteLearnerForm({
  inviteAction,
}: {
  inviteAction: (email: string) => Promise<LinkActionResult>;
}) {
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);
  const [isPending, startTransition] = useTransition();

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (isPending) return;
    setError(null);
    setSent(false);
    startTransition(async () => {
      const result = await inviteAction(email);
      if (result?.ok) {
        setEmail("");
        setSent(true);
      } else {
        setError(result?.error ?? "Something went wrong. Please try again.");
      }
    });
  }

  return (
    <form onSubmit={handleSubmit}>
      <div className="flex flex-col gap-3 sm:flex-row">
        <input
          type="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          required
          aria-label="Learner email"
          autoComplete="off"
          placeholder="learner@example.com"
          className="w-full rounded-xl border border-line bg-background px-4 py-3 text-sm text-foreground outline-none focus:border-brand sm:flex-1"
        />
        <button
          type="submit"
          disabled={isPending}
          className="shrink-0 rounded-xl bg-brand px-5 py-3 text-sm font-semibold text-white hover:bg-brand-dark disabled:opacity-50"
        >
          {isPending ? "Sending…" : "Send link request"}
        </button>
      </div>
      {error && (
        <Alert variant="error" className="mt-3">
          {error}
        </Alert>
      )}
      {sent && (
        <Alert variant="success" className="mt-3">
          Request sent. Your learner can accept it from their dashboard.
        </Alert>
      )}
    </form>
  );
}
