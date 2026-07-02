import Link from "next/link";
import { notFound } from "next/navigation";
import { RoleHeader } from "@/components/role-header";
import { requireRole } from "@/lib/auth/require-role";
import { createClient } from "@/lib/supabase/server";
import { GeneratedResourceView } from "@/components/teacher/GeneratedResourceView";
import { PendingResourcesNotice } from "@/components/teacher/ResourceList";
import { isWorksheetContent, isMissingTableError } from "@/lib/math/teacher-resources";

export default async function TeacherResourceDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await requireRole("teacher");
  const { id } = await params;

  const supabase = await createClient();
  // Ownership: only a resource belonging to this teacher can be read. Any error
  // (missing table, bad id) or no row → notFound, never another teacher's data.
  const { data, error } = await supabase
    .from("teacher_resources")
    .select("content")
    .eq("id", id)
    .eq("teacher_id", user.id)
    .maybeSingle();

  // Table not present yet → explain instead of a bare 404.
  if (isMissingTableError(error)) {
    return (
      <>
        <RoleHeader role="teacher" />
        <main className="mx-auto max-w-4xl space-y-6 px-5 py-10">
          <div className="print:hidden">
            <Link href="/teacher/resources" className="inline-flex items-center gap-1 text-sm font-semibold text-brand hover:underline">
              <span aria-hidden>←</span> Back to resources
            </Link>
          </div>
          <PendingResourcesNotice />
        </main>
      </>
    );
  }

  if (error || !data) notFound();
  const content = (data as { content: unknown }).content;
  if (!isWorksheetContent(content)) notFound();

  return (
    <>
      <RoleHeader role="teacher" />
      <main className="mx-auto max-w-4xl space-y-6 px-5 py-10">
        <div className="print:hidden">
          <Link href="/teacher/resources" className="inline-flex items-center gap-1 text-sm font-semibold text-brand hover:underline">
            <span aria-hidden>←</span> Back to resources
          </Link>
        </div>
        <GeneratedResourceView content={content} />
      </main>
    </>
  );
}
