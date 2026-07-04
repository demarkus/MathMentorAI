"use client";

import { useState, useTransition } from "react";

/**
 * Explicit "start" control for a diagnostic/practice run. The session is only
 * issued when the learner clicks — a GET render or prefetch of the page never
 * triggers the server action, so no database row is created on navigation.
 * On success the action redirects (throws NEXT_REDIRECT, handled by the router);
 * on failure it returns an error we surface inline.
 */
export function QuizStartForm({
  action,
  label,
  pendingLabel,
}: {
  action: () => Promise<{ error?: string } | void>;
  label: string;
  pendingLabel: string;
}) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  return (
    <div className="space-y-3">
      <button
        type="button"
        disabled={pending}
        onClick={() =>
          startTransition(async () => {
            setError(null);
            const result = await action();
            if (result && "error" in result && result.error) setError(result.error);
          })
        }
        className="inline-flex rounded-xl bg-brand px-5 py-3 font-semibold text-white hover:bg-brand-dark disabled:opacity-60"
      >
        {pending ? pendingLabel : label}
      </button>
      {error && (
        <p role="alert" className="text-sm font-medium text-red-700">
          {error}
        </p>
      )}
    </div>
  );
}
