import Link from "next/link";
import { RoleHeader } from "@/components/role-header";
import { requireRole } from "@/lib/auth/require-role";
import { createClient } from "@/lib/supabase/server";
import { DashboardHeader } from "@/components/dashboard/DashboardHeader";
import { ResourceList, PendingResourcesNotice, type ResourceListItem } from "@/components/teacher/ResourceList";
import { isResourceType, isMissingTableError } from "@/lib/math/teacher-resources";
import { Pagination, parsePage } from "@/components/ui/Pagination";

const PAGE_SIZE = 20;

type ResourceRow = {
  id: string;
  title: string;
  grade: number;
  resource_type: string;
  created_at: string;
};

export default async function TeacherResourcesPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const user = await requireRole("teacher");
  const { page: pageParam } = await searchParams;
  const page = parsePage(pageParam);
  const supabase = await createClient();

  // Scoped to the current teacher and paginated.
  const from = (page - 1) * PAGE_SIZE;
  const { data, error, count } = await supabase
    .from("teacher_resources")
    .select("id, title, grade, resource_type, created_at", { count: "exact" })
    .eq("teacher_id", user.id)
    .order("created_at", { ascending: false })
    .range(from, from + PAGE_SIZE - 1);

  const tableMissing = isMissingTableError(error);
  // A real DB error (not just the table being absent pre-migration) is surfaced,
  // not silently shown as an empty list.
  const loadFailed = Boolean(error) && !tableMissing;
  const total = count ?? 0;
  const items: ResourceListItem[] = error
    ? []
    : ((data ?? []) as unknown as ResourceRow[]).map((row) => ({
        id: row.id,
        title: row.title,
        grade: row.grade,
        resourceType: isResourceType(row.resource_type) ? row.resource_type : "worksheet",
        createdAt: row.created_at,
      }));

  return (
    <>
      <RoleHeader role="teacher" />
      <main className="mx-auto max-w-4xl space-y-8 px-5 py-10">
        <Link href="/teacher" className="inline-flex items-center gap-1 text-sm font-semibold text-brand hover:underline">
          <span aria-hidden>←</span> Back to dashboard
        </Link>

        <div className="flex flex-wrap items-end justify-between gap-4">
          <DashboardHeader eyebrow="TeacherMate" title="My resources" subtitle="Your saved worksheets, tests, memos, and revision packs." />
          <Link href="/teacher/generator" className="shrink-0 rounded-xl bg-brand px-5 py-3 font-semibold text-white hover:bg-brand-dark">
            New resource
          </Link>
        </div>

        {tableMissing ? (
          <PendingResourcesNotice />
        ) : loadFailed ? (
          <div className="rounded-2xl border border-line bg-white p-8 text-center">
            <h2 className="text-lg font-semibold">We couldn’t load your resources</h2>
            <p className="mt-2 text-sm text-muted">Something went wrong. Please refresh to try again.</p>
          </div>
        ) : (
          <>
            <ResourceList items={items} />
            <Pagination basePath="/teacher/resources" params={{ page: pageParam }} page={page} pageSize={PAGE_SIZE} total={total} />
          </>
        )}
      </main>
    </>
  );
}
