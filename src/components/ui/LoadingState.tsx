/** A single shimmering placeholder block. */
export function Skeleton({ className = "" }: { className?: string }) {
  return <div className={`animate-pulse rounded bg-line ${className}`} />;
}

/**
 * Standard route-level loading skeleton: a header stub plus a grid of card
 * stubs. Announced politely to assistive tech via role="status".
 */
export function LoadingState({ cards = 6, label = "Loading…" }: { cards?: number; label?: string }) {
  return (
    <div className="space-y-8" role="status" aria-live="polite">
      <span className="sr-only">{label}</span>
      <div className="space-y-3">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-9 w-64 rounded-lg" />
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: cards }).map((_, index) => (
          <div key={index} className="h-40 animate-pulse rounded-2xl border border-line bg-white" />
        ))}
      </div>
    </div>
  );
}
