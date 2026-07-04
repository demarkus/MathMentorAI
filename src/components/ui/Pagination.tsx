import Link from "next/link";

/**
 * Server-rendered prev/next pager. Preserves the current query params (filters)
 * and only swaps `page`. Renders nothing when there is a single page.
 */
export function Pagination({
  basePath,
  params,
  page,
  pageSize,
  total,
}: {
  basePath: string;
  params: Record<string, string | undefined>;
  page: number;
  pageSize: number;
  total: number;
}) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  if (totalPages <= 1) return null;

  const href = (target: number) => {
    const sp = new URLSearchParams();
    for (const [key, value] of Object.entries(params)) {
      if (value && key !== "page") sp.set(key, value);
    }
    if (target > 1) sp.set("page", String(target));
    const qs = sp.toString();
    return qs ? `${basePath}?${qs}` : basePath;
  };

  const linkClass = "rounded-xl border border-line px-4 py-2 text-sm font-semibold hover:border-brand/40";
  const disabledClass = "rounded-xl border border-line px-4 py-2 text-sm font-semibold opacity-40 pointer-events-none";

  return (
    <nav className="flex items-center justify-between gap-3" aria-label="Pagination">
      {page > 1 ? (
        <Link href={href(page - 1)} className={linkClass} rel="prev">
          ← Previous
        </Link>
      ) : (
        <span className={disabledClass} aria-disabled="true">
          ← Previous
        </span>
      )}

      <span className="text-sm text-muted">
        Page {page} of {totalPages}
      </span>

      {page < totalPages ? (
        <Link href={href(page + 1)} className={linkClass} rel="next">
          Next →
        </Link>
      ) : (
        <span className={disabledClass} aria-disabled="true">
          Next →
        </span>
      )}
    </nav>
  );
}

/** Parses a 1-based page number from an untrusted query value (defaults to 1). */
export function parsePage(value: string | undefined): number {
  const n = Number(value);
  return Number.isInteger(n) && n >= 1 ? n : 1;
}
