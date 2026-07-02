import Link from "next/link";
import { resourceTypeLabel, type ResourceType } from "@/lib/math/teacher-resources";
import { EmptyState } from "@/components/ui/EmptyState";

export type ResourceListItem = {
  id: string;
  title: string;
  grade: number;
  resourceType: ResourceType;
  createdAt: string;
};

function formatDate(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  return date.toISOString().slice(0, 10);
}

/** Shown while the teacher_resources table is not yet present in the schema. */
export function PendingResourcesNotice() {
  return (
    <EmptyState
      icon="🗂️"
      title="Saved resources coming soon"
      description="Saving is enabled once the teacher_resources table is added. Until then, you can generate and print resources directly from the generator."
      action={
        <Link
          href="/teacher/generator"
          className="inline-flex rounded-xl bg-brand px-5 py-3 font-semibold text-white hover:bg-brand-dark"
        >
          Open the generator
        </Link>
      }
    />
  );
}

export function ResourceList({ items }: { items: ResourceListItem[] }) {
  if (items.length === 0) {
    return (
      <EmptyState
        title="No resources yet"
        description="Generate a worksheet, test, or memo and it will be saved here."
        action={
          <Link
            href="/teacher/generator"
            className="inline-flex rounded-xl bg-brand px-5 py-3 font-semibold text-white hover:bg-brand-dark"
          >
            Open the generator
          </Link>
        }
      />
    );
  }

  return (
    <ul className="divide-y divide-line overflow-hidden rounded-2xl border border-line bg-white">
      {items.map((item) => (
        <li key={item.id}>
          <Link href={`/teacher/resources/${item.id}`} className="flex items-center justify-between gap-3 px-5 py-4 hover:bg-background">
            <div className="min-w-0">
              <p className="truncate font-medium">{item.title}</p>
              <p className="text-xs text-muted">
                Grade {item.grade} · {resourceTypeLabel(item.resourceType)}
                {formatDate(item.createdAt) ? ` · ${formatDate(item.createdAt)}` : ""}
              </p>
            </div>
            <span aria-hidden className="shrink-0 text-brand">
              →
            </span>
          </Link>
        </li>
      ))}
    </ul>
  );
}
