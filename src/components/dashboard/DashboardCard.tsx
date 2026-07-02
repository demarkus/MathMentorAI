import type { ReactNode } from "react";

/**
 * Static content / placeholder card. Use `badge` for status pills such as
 * "Coming soon" or "Not linked".
 */
export function DashboardCard({
  title,
  eyebrow,
  badge,
  children,
  className = "",
}: {
  title: string;
  eyebrow?: string;
  badge?: string;
  children?: ReactNode;
  className?: string;
}) {
  return (
    <article className={`flex h-full flex-col rounded-2xl border border-line bg-white p-6 ${className}`}>
      <div className="flex items-start justify-between gap-3">
        <div>
          {eyebrow && <p className="text-xs font-semibold uppercase tracking-wide text-brand">{eyebrow}</p>}
          <h3 className="mt-1 text-lg font-semibold">{title}</h3>
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
