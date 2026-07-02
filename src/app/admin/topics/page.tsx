import Link from "next/link";
import { RoleHeader } from "@/components/role-header";
import { requireRole } from "@/lib/auth/require-role";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { DashboardHeader } from "@/components/dashboard/DashboardHeader";
import { TopicTable, type AdminTopicRow } from "@/components/admin/TopicTable";

export default async function AdminTopicsPage() {
  await requireRole("admin");

  const admin = createServiceRoleClient();
  let topics: AdminTopicRow[] = [];
  let configError = false;

  if (!admin) {
    configError = true;
  } else {
    const { data } = await admin
      .from("topics")
      .select("id, grade, name, slug, description, curriculum_tag, display_order")
      .order("grade", { ascending: true })
      .order("display_order", { ascending: true });
    topics = (data ?? []) as AdminTopicRow[];
  }

  return (
    <>
      <RoleHeader role="admin" />
      <main className="mx-auto max-w-6xl space-y-8 px-5 py-10">
        <Link href="/admin" className="inline-flex items-center gap-1 text-sm font-semibold text-brand hover:underline">
          <span aria-hidden>←</span> Back to dashboard
        </Link>

        <DashboardHeader
          eyebrow="Admin"
          title="Topics"
          subtitle="The CAPS topic catalogue. Topics are read-only here and managed via the seed."
        />

        {configError ? (
          <div className="rounded-2xl border border-line bg-white p-8 text-center text-sm text-muted">
            Topic management is unavailable: the service role key is not configured.
          </div>
        ) : (
          <TopicTable topics={topics} />
        )}
      </main>
    </>
  );
}
