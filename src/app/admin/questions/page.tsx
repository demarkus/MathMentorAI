import Link from "next/link";
import { RoleHeader } from "@/components/role-header";
import { requireRole } from "@/lib/auth/require-role";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { DashboardHeader } from "@/components/dashboard/DashboardHeader";
import { QuestionTable, type AdminQuestionRow } from "@/components/admin/QuestionTable";
import { Pagination, parsePage } from "@/components/ui/Pagination";

const DIFFICULTIES = ["easy", "medium", "hard"] as const;
const PAGE_SIZE = 25;

type TopicOption = { id: string; name: string; grade: number };

type QuestionRow = {
  id: string;
  question_text: string;
  grade: number;
  difficulty: string;
  marks: number;
  is_active: boolean;
  topic_id: string;
};

export default async function AdminQuestionsPage({
  searchParams,
}: {
  searchParams: Promise<{ grade?: string; topic?: string; difficulty?: string; page?: string }>;
}) {
  await requireRole("admin");
  const params = await searchParams;
  const page = parsePage(params.page);

  const admin = createServiceRoleClient();
  if (!admin) {
    return (
      <>
        <RoleHeader role="admin" />
        <main className="mx-auto max-w-6xl px-5 py-10">
          <div className="rounded-2xl border border-line bg-white p-8 text-center text-sm text-muted">
            Question management is unavailable: the service role key is not configured.
          </div>
        </main>
      </>
    );
  }

  // Topics power both the filter dropdown and the id → name lookup.
  const { data: topicData } = await admin
    .from("topics")
    .select("id, name, grade")
    .order("grade", { ascending: true })
    .order("display_order", { ascending: true });
  const topics = (topicData ?? []) as TopicOption[];
  const topicName = new Map(topics.map((topic) => [topic.id, topic.name]));

  // Sanitise filters against known values before querying.
  const gradeFilter = params.grade === "9" || params.grade === "10" ? Number(params.grade) : undefined;
  const difficultyFilter = DIFFICULTIES.includes(params.difficulty as (typeof DIFFICULTIES)[number])
    ? params.difficulty
    : undefined;
  const topicFilter = topics.some((topic) => topic.id === params.topic) ? params.topic : undefined;

  const from = (page - 1) * PAGE_SIZE;
  let query = admin
    .from("questions")
    .select("id, question_text, grade, difficulty, marks, is_active, topic_id", { count: "exact" })
    .order("created_at", { ascending: false })
    .range(from, from + PAGE_SIZE - 1);
  if (gradeFilter) query = query.eq("grade", gradeFilter);
  if (difficultyFilter) query = query.eq("difficulty", difficultyFilter);
  if (topicFilter) query = query.eq("topic_id", topicFilter);

  const { data: questionData, error: questionError, count } = await query;
  const total = count ?? 0;
  const rows: AdminQuestionRow[] = ((questionData ?? []) as QuestionRow[]).map((row) => ({
    id: row.id,
    question_text: row.question_text,
    topicName: topicName.get(row.topic_id) ?? "—",
    grade: row.grade,
    difficulty: row.difficulty,
    marks: row.marks,
    is_active: row.is_active,
  }));

  const selectClass = "rounded-xl border border-line bg-white px-4 py-2.5 text-sm outline-none focus:border-brand";

  return (
    <>
      <RoleHeader role="admin" />
      <main className="mx-auto max-w-6xl space-y-8 px-5 py-10">
        <Link href="/admin" className="inline-flex items-center gap-1 text-sm font-semibold text-brand hover:underline">
          <span aria-hidden>←</span> Back to dashboard
        </Link>

        <div className="flex flex-wrap items-end justify-between gap-4">
          <DashboardHeader
            eyebrow="Admin"
            title="Question bank"
            subtitle="Review, add, and curate questions across topics and grades."
          />
          <Link
            href="/admin/questions/new"
            className="shrink-0 rounded-xl bg-brand px-5 py-3 font-semibold text-white hover:bg-brand-dark"
          >
            New question
          </Link>
        </div>

        <form method="get" className="flex flex-wrap items-end gap-3 rounded-2xl border border-line bg-white p-4">
          <label className="text-sm font-medium">
            <span className="mb-1 block text-xs text-muted">Grade</span>
            <select name="grade" defaultValue={params.grade ?? ""} className={selectClass}>
              <option value="">All grades</option>
              <option value="9">Grade 9</option>
              <option value="10">Grade 10</option>
            </select>
          </label>

          <label className="text-sm font-medium">
            <span className="mb-1 block text-xs text-muted">Topic</span>
            <select name="topic" defaultValue={params.topic ?? ""} className={selectClass}>
              <option value="">All topics</option>
              {topics.map((topic) => (
                <option key={topic.id} value={topic.id}>
                  Grade {topic.grade} · {topic.name}
                </option>
              ))}
            </select>
          </label>

          <label className="text-sm font-medium">
            <span className="mb-1 block text-xs text-muted">Difficulty</span>
            <select name="difficulty" defaultValue={params.difficulty ?? ""} className={selectClass}>
              <option value="">All difficulties</option>
              {DIFFICULTIES.map((value) => (
                <option key={value} value={value}>
                  {value[0].toUpperCase() + value.slice(1)}
                </option>
              ))}
            </select>
          </label>

          <button type="submit" className="rounded-xl border border-line px-4 py-2.5 text-sm font-semibold hover:border-brand">
            Apply filters
          </button>
          <Link href="/admin/questions" className="px-2 py-2.5 text-sm font-semibold text-muted hover:text-brand">
            Reset
          </Link>
        </form>

        {questionError ? (
          <div className="rounded-2xl border border-line bg-white p-8 text-center">
            <h2 className="text-lg font-semibold">We couldn’t load the question bank</h2>
            <p className="mt-2 text-sm text-muted">Something went wrong fetching questions. Please refresh to try again.</p>
          </div>
        ) : (
          <>
            <p className="text-sm text-muted">
              {total} question{total === 1 ? "" : "s"}
              {total > PAGE_SIZE ? ` · showing ${rows.length} on this page` : ""}
            </p>
            <QuestionTable questions={rows} />
            <Pagination basePath="/admin/questions" params={params} page={page} pageSize={PAGE_SIZE} total={total} />
          </>
        )}
      </main>
    </>
  );
}
