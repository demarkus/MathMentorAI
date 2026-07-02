import Link from "next/link";
import { RoleHeader } from "@/components/role-header";
import { requireRole } from "@/lib/auth/require-role";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { DashboardHeader } from "@/components/dashboard/DashboardHeader";
import { QuestionForm, type FormTopic } from "@/components/admin/QuestionForm";
import { createQuestion } from "../actions";

export default async function NewQuestionPage() {
  await requireRole("admin");

  const admin = createServiceRoleClient();
  let topics: FormTopic[] = [];
  if (admin) {
    const { data } = await admin
      .from("topics")
      .select("id, name, slug, grade")
      .order("grade", { ascending: true })
      .order("display_order", { ascending: true });
    topics = (data ?? []) as FormTopic[];
  }

  return (
    <>
      <RoleHeader role="admin" />
      <main className="mx-auto max-w-3xl space-y-8 px-5 py-10">
        <Link
          href="/admin/questions"
          className="inline-flex items-center gap-1 text-sm font-semibold text-brand hover:underline"
        >
          <span aria-hidden>←</span> Back to questions
        </Link>

        <DashboardHeader eyebrow="Admin" title="New question" subtitle="Add a question to the CAPS question bank." />

        {topics.length === 0 ? (
          <div className="rounded-2xl border border-line bg-white p-8 text-center text-sm text-muted">
            No topics are available, so questions can’t be created yet.
          </div>
        ) : (
          <QuestionForm topics={topics} onSubmit={createQuestion} submitLabel="Create question" />
        )}
      </main>
    </>
  );
}
