/** Presentational progress header + bar. Reusable across quiz flows. */
export function QuizProgress({ current, total, answered }: { current: number; total: number; answered: number }) {
  const percent = total ? Math.round(((current + 1) / total) * 100) : 0;
  return (
    <div>
      <div className="flex items-center justify-between text-sm">
        <span className="font-semibold text-brand">
          Question {current + 1} of {total}
        </span>
        <span className="text-muted">{answered} answered</span>
      </div>
      <div className="mt-3 h-1.5 rounded-full bg-line">
        <div className="h-1.5 rounded-full bg-brand transition-all" style={{ width: `${percent}%` }} />
      </div>
    </div>
  );
}
