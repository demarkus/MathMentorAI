import type { TopicPerformance } from "@/lib/math/progress";

/** Per-topic accuracy table with a mastery bar. Scrolls horizontally on mobile. */
export function TopicPerformanceTable({ rows }: { rows: TopicPerformance[] }) {
  if (rows.length === 0) {
    return (
      <div className="rounded-2xl border border-line bg-white p-6 text-sm text-muted">
        No topic performance yet. Complete some practice to see your mastery per topic.
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-2xl border border-line bg-white">
      <table className="w-full min-w-[32rem] text-sm">
        <thead className="border-b border-line text-left text-muted">
          <tr>
            <th className="px-5 py-3 font-medium">Topic</th>
            <th className="px-5 py-3 font-medium">Grade</th>
            <th className="px-5 py-3 font-medium">Correct</th>
            <th className="px-5 py-3 font-medium">Mastery</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.topicId} className="border-b border-line last:border-0">
              <td className="px-5 py-3 font-medium">{row.topic}</td>
              <td className="px-5 py-3 text-muted">{row.grade}</td>
              <td className="px-5 py-3 font-mono text-muted">
                {row.correct}/{row.attempts}
              </td>
              <td className="px-5 py-3">
                <div className="flex items-center gap-3">
                  <div className="h-1.5 w-24 shrink-0 rounded-full bg-line">
                    <div className="h-1.5 rounded-full bg-brand" style={{ width: `${row.percentage}%` }} />
                  </div>
                  <span className="font-mono text-xs text-muted">{row.percentage}%</span>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
