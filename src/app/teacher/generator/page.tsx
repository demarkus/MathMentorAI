import Link from "next/link";
import { RoleHeader } from "@/components/role-header";
import { requireRole } from "@/lib/auth/require-role";
import { createClient } from "@/lib/supabase/server";
import { DashboardHeader } from "@/components/dashboard/DashboardHeader";
import { WorksheetGeneratorForm, type FormTopic } from "@/components/teacher/WorksheetGeneratorForm";
import { generateWorksheet } from "./actions";

export default async function TeacherGeneratorPage() {
  await requireRole("teacher");

  const supabase = await createClient();
  const { data } = await supabase
    .from("topics")
    .select("id, name, slug, grade")
    .order("grade", { ascending: true })
    .order("display_order", { ascending: true });
  const topics = (data ?? []) as FormTopic[];

  return (
    <>
      <RoleHeader role="teacher" />
      <main className="mx-auto max-w-4xl space-y-8 px-5 py-10">
        <div className="print:hidden">
          <Link href="/teacher" className="inline-flex items-center gap-1 text-sm font-semibold text-brand hover:underline">
            <span aria-hidden>←</span> Back to dashboard
          </Link>
        </div>

        <div className="print:hidden">
          <DashboardHeader
            eyebrow="TeacherMate"
            title="Worksheet generator"
            subtitle="Build a worksheet, test, memo, or revision pack from the CAPS question bank — with an answer memo included."
          />
        </div>

        {topics.length === 0 ? (
          <div className="rounded-2xl border border-line bg-white p-8 text-center">
            <h2 className="text-lg font-semibold">No topics available</h2>
            <p className="mt-2 text-sm text-muted">
              There aren’t any topics to generate from yet. Please check back once the question bank is populated.
            </p>
          </div>
        ) : (
          <WorksheetGeneratorForm topics={topics} onGenerate={generateWorksheet} />
        )}
      </main>
    </>
  );
}
