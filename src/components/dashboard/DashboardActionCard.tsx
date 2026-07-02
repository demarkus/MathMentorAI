import Link from "next/link";

/** Clickable card that links to a feature (a call to action). */
export function DashboardActionCard({
  href,
  title,
  description,
  cta = "Open",
  icon,
  badge,
}: {
  href: string;
  title: string;
  description: string;
  cta?: string;
  icon?: string;
  badge?: string;
}) {
  return (
    <Link
      href={href}
      className="group flex h-full flex-col rounded-2xl border border-line bg-white p-6 hover:-translate-y-0.5 hover:border-brand/40"
    >
      {(icon || badge) && (
        <div className="flex items-start justify-between gap-3">
          {icon && <span className="grid size-10 place-items-center rounded-xl bg-brand/10 text-lg">{icon}</span>}
          {badge && (
            <span className="rounded-full bg-accent/15 px-3 py-1 text-xs font-medium text-brand-dark">{badge}</span>
          )}
        </div>
      )}
      <h3 className={`${icon || badge ? "mt-4" : ""} text-lg font-semibold`}>{title}</h3>
      <p className="mt-2 text-sm leading-6 text-muted">{description}</p>
      <span className="mt-auto inline-flex items-center gap-1 pt-4 text-sm font-semibold text-brand group-hover:gap-2">
        {cta} <span aria-hidden>→</span>
      </span>
    </Link>
  );
}
