export type RecommendationItem = {
  title: string;
  description?: string;
};

/**
 * Lists recommended practice for a linked learner. With no items it renders a
 * safe empty state (no linked learner yet, or nothing to recommend).
 */
export function RecommendationList({
  items = [],
  emptyMessage = "Personalised recommendations will appear once your learner is securely connected.",
}: {
  items?: RecommendationItem[];
  emptyMessage?: string;
}) {
  if (items.length === 0) {
    return <div className="rounded-2xl border border-line bg-white p-6 text-sm text-muted">{emptyMessage}</div>;
  }

  return (
    <ul className="divide-y divide-line overflow-hidden rounded-2xl border border-line bg-white">
      {items.map((item) => (
        <li key={item.title} className="px-5 py-4">
          <p className="font-semibold">{item.title}</p>
          {item.description && <p className="mt-1 text-sm text-muted">{item.description}</p>}
        </li>
      ))}
    </ul>
  );
}
