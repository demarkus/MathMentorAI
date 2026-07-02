import type { ProgressAttempt } from "@/lib/math/progress";
import { Badge } from "@/components/ui/Badge";

/** Recent attempts with a correct/missed badge. */
export function RecentActivityList({ items }: { items: ProgressAttempt[] }) {
  if (items.length === 0) {
    return (
      <div className="rounded-2xl border border-line bg-white p-6 text-sm text-muted">
        No recent activity yet. Your latest attempts will show up here.
      </div>
    );
  }

  return (
    <ul className="divide-y divide-line overflow-hidden rounded-2xl border border-line bg-white">
      {items.map((item) => (
        <li key={item.id} className="flex items-center justify-between gap-3 px-5 py-3">
          <div className="min-w-0">
            <p className="truncate font-mono text-sm">{item.questionText}</p>
            <p className="text-xs text-muted">
              {item.topicName} · Grade {item.grade}
            </p>
          </div>
          <Badge tone={item.isCorrect ? "success" : "warning"} className="shrink-0 font-semibold">
            {item.isCorrect ? "Correct" : "Missed"}
          </Badge>
        </li>
      ))}
    </ul>
  );
}
