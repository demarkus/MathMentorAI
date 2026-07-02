import { EmptyState } from "@/components/ui/EmptyState";

export type AdminTopicRow = {
  id: string;
  grade: number;
  name: string;
  slug: string;
  description: string;
  curriculum_tag: string;
  display_order: number;
};

export function TopicTable({ topics }: { topics: AdminTopicRow[] }) {
  if (topics.length === 0) {
    return <EmptyState title="No topics yet" description="Topics are seeded from the CAPS catalogue." />;
  }

  return (
    <div className="overflow-x-auto rounded-2xl border border-line bg-white">
      <table className="w-full min-w-[720px] text-left text-sm">
        <thead className="border-b border-line text-xs uppercase tracking-wide text-muted">
          <tr>
            <th className="px-4 py-3 font-semibold">Order</th>
            <th className="px-4 py-3 font-semibold">Grade</th>
            <th className="px-4 py-3 font-semibold">Name</th>
            <th className="px-4 py-3 font-semibold">Slug</th>
            <th className="px-4 py-3 font-semibold">Description</th>
            <th className="px-4 py-3 font-semibold">Curriculum</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-line">
          {topics.map((topic) => (
            <tr key={topic.id} className="align-top">
              <td className="px-4 py-3 text-muted">{topic.display_order}</td>
              <td className="px-4 py-3">Grade {topic.grade}</td>
              <td className="px-4 py-3 font-medium">{topic.name}</td>
              <td className="px-4 py-3">
                <code className="rounded bg-background px-1.5 py-0.5 text-xs">{topic.slug}</code>
              </td>
              <td className="px-4 py-3 text-muted">{topic.description}</td>
              <td className="px-4 py-3 text-muted">{topic.curriculum_tag}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
