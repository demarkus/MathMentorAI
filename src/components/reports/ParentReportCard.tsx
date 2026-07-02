import type { ReactNode } from "react";

/**
 * Reusable card for a parent report section. Styled to match the dashboard
 * cards; `badge` carries a status pill such as "Coming soon" or "Not linked".
 */
export function ParentReportCard({
  title,
  badge,
  icon,
  children,
}: {
  title: string;
  badge?: string;
  icon?: string;
  children?: ReactNode;
}) {
  return (
    <article className="flex h-full flex-col rounded-2xl border border-line bg-white p-6">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          {icon && <span className="grid size-9 place-items-center rounded-xl bg-brand/10 text-lg">{icon}</span>}
          <h3 className="text-lg font-semibold">{title}</h3>
        </div>
        {badge && (
          <span className="shrink-0 rounded-full border border-line bg-background px-3 py-1 text-xs font-medium text-muted">
            {badge}
          </span>
        )}
      </div>
      {children && <div className="mt-3 text-sm leading-6 text-muted">{children}</div>}
    </article>
  );
}
