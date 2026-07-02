import Link from "next/link";
import { RoleHeader } from "@/components/role-header";
import { requireRole } from "@/lib/auth/require-role";
import { createClient } from "@/lib/supabase/server";
import { DashboardHeader } from "@/components/dashboard/DashboardHeader";
import { ResourceList, PendingResourcesNotice, type ResourceListItem } from "@/components/teacher/ResourceList";
import { isResourceType, isMissingTableError } from "@/lib/math/teacher-resources";

type ResourceRow = {
  id: string;
  title: string;
  grade: number;
  resource_type: string;
  created_at: string;
};

export default async function TeacherResourcesPage() {
  const user = await requireRole("teacher");
  const supabase = await createClient();

  // Scoped to the current teacher. Errors (e.g. table not yet present) → empty.
  const { data, error } = await supabase
    .from("teacher_resources")
    .select("id, title, grade, resource_type, created_at")
    .eq("teacher_id", user.id)
    .order("created_at", { ascending: false });

  const tableMissing = isMissingTableError(error);
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

        {tableMissing ? <PendingResourcesNotice /> : <ResourceList items={items} />}
      </main>
    </>
  );
}
