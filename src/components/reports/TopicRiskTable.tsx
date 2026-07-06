export type TopicRiskRow = {
  topic: string;
  grade?: number;
  risk: string;
};

/**
 * Displays at-risk topics for a linked learner. With no rows it renders a safe
 * empty state (no linked learner yet, or no weak topics to show).
 */
export function TopicRiskTable({
  rows = [],
  emptyMessage = "Weak topics will appear here once your learner is securely connected.",
}: {
  rows?: TopicRiskRow[];
  emptyMessage?: string;
}) {
  if (rows.length === 0) {
    return <div className="rounded-2xl border border-line bg-white p-6 text-sm text-muted">{emptyMessage}</div>;
  }

  return (
    <div className="overflow-x-auto rounded-2xl border border-line bg-white">
      <table className="w-full min-w-[28rem] text-sm">
        <thead className="border-b border-line text-left text-muted">
          <tr>
            <th className="px-5 py-3 font-medium">Topic</th>
            <th className="px-5 py-3 font-medium">Grade</th>
            <th className="px-5 py-3 font-medium">Risk</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={`${row.topic}-${row.grade ?? ""}`} className="border-b border-line last:border-0">
              <td className="px-5 py-3 font-medium">{row.topic}</td>
              <td className="px-5 py-3 text-muted">{row.grade ?? "—"}</td>
              <td className="px-5 py-3">
                <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-950">{row.risk}</span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
