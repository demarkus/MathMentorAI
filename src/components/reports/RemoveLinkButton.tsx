"use client";

import { useState, useTransition } from "react";
import type { LinkActionResult } from "@/app/parent/reports/actions";

/**
 * Removes a parent-learner link (pending or accepted). The Server Action
 * arrives as a prop; removal is scoped to the signed-in parent server-side.
 */
export function RemoveLinkButton({
  linkId,
  removeAction,
}: {
  linkId: string;
  removeAction: (linkId: string) => Promise<LinkActionResult>;
}) {
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleClick() {
    if (isPending) return;
    setError(null);
    startTransition(async () => {
      const result = await removeAction(linkId);
      if (!result?.ok) setError(result?.error ?? "Something went wrong. Please try again.");
    });
  }

  return (
    <span className="inline-flex flex-col items-end gap-1">
      <button
        type="button"
        onClick={handleClick}
        disabled={isPending}
        className="rounded-lg border border-line px-3 py-1.5 text-xs font-semibold text-muted hover:border-red-300 hover:text-red-700 disabled:opacity-50"
      >
        {isPending ? "Removing…" : "Remove"}
      </button>
      {error && (
        <span role="alert" className="text-xs text-red-700">
          {error}
        </span>
      )}
    </span>
  );
}
