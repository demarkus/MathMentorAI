/** A single headline metric card (e.g. "Average score" → "78%"). */
export function ProgressStatCard({ label, value, note }: { label: string; value: string; note?: string }) {
  return (
    <article className="rounded-2xl border border-line bg-white p-6">
      <p className="text-sm text-muted">{label}</p>
      <p className="mt-3 font-mono text-4xl font-semibold">{value}</p>
      {note && <p className="mt-3 text-sm text-muted">{note}</p>}
    </article>
  );
}
