import type { ReactNode } from "react";

/** Responsive card grid. Stacks on mobile, then 2 / 3 columns as space allows. */
export function DashboardGrid({
  children,
  cols = 3,
  className = "",
}: {
  children: ReactNode;
  cols?: 2 | 3;
  className?: string;
}) {
  const colClass = cols === 2 ? "sm:grid-cols-2" : "sm:grid-cols-2 lg:grid-cols-3";
  return <div className={`grid gap-4 ${colClass} ${className}`}>{children}</div>;
}
