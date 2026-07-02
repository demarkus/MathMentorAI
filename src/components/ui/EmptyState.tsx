import type { ReactNode } from "react";
import { Card } from "./Card";

/**
 * The standard centered placeholder for empty, error, and not-found states.
 * `headingLevel` lets callers keep the document outline correct — use "h1"
 * when this is the page's primary heading (e.g. a not-found page).
 */
export function EmptyState({
  icon,
  title,
  description,
  action,
  headingLevel = "h2",
  className = "",
}: {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
  headingLevel?: "h1" | "h2";
  className?: string;
}) {
  const Heading = headingLevel;
  return (
    <Card className={`p-8 text-center ${className}`}>
      {icon && (
        <span aria-hidden className="mx-auto mb-4 grid size-12 place-items-center rounded-full bg-brand/10 text-2xl">
          {icon}
        </span>
      )}
      <Heading className="text-lg font-semibold">{title}</Heading>
      {description && <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-muted">{description}</p>}
      {action && <div className="mt-6 flex flex-wrap justify-center gap-3">{action}</div>}
    </Card>
  );
}
