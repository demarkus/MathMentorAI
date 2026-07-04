import { test, expect } from "vitest";
import { loadLearnerProgress } from "@/lib/progress/load-progress";
import type { SupabaseClient } from "@supabase/supabase-js";

type Fixtures = {
  attemptsCount: number;
  correctCount: number;
  attemptRows: unknown[];
  submittedCount: number;
  sessionRows: unknown[];
  topicRows: unknown[];
  reportRow: { data: unknown } | null;
};

// A minimal chainable Supabase stand-in that resolves each query from fixtures
// based on the table, whether COUNT(head) was requested, and the eq() filters.
function fakeClient(f: Fixtures): SupabaseClient {
  const make = (table: string) => {
    const state = { table, head: false, eqs: [] as Array<[string, unknown]> };
    const resolve = () => {
      if (state.table === "attempts") {
        if (state.head) {
          const correctOnly = state.eqs.some(([c, v]) => c === "is_correct" && v === true);
          return { data: null, count: correctOnly ? f.correctCount : f.attemptsCount, error: null };
        }
        return { data: f.attemptRows, count: null, error: null };
      }
      if (state.table === "quiz_sessions") {
        if (state.head) return { data: null, count: f.submittedCount, error: null };
        return { data: f.sessionRows, count: null, error: null };
      }
      if (state.table === "topics") return { data: f.topicRows, count: null, error: null };
      if (state.table === "reports") return { data: f.reportRow, count: null, error: null };
      return { data: [], count: 0, error: null };
    };
    const api: Record<string, unknown> = {
      select: (_c: string, opts?: { head?: boolean }) => {
        state.head = Boolean(opts?.head);
        return api;
      },
      eq: (c: string, v: unknown) => {
        state.eqs.push([c, v]);
        return api;
      },
      order: () => api,
      limit: () => api,
      maybeSingle: () => Promise.resolve(resolve()),
      then: (onOk: (v: unknown) => unknown, onErr?: (e: unknown) => unknown) =>
        Promise.resolve(resolve()).then(onOk, onErr),
    };
    return api;
  };
  return { from: (t: string) => make(t) } as unknown as SupabaseClient;
}

const base: Fixtures = {
  attemptsCount: 1000,
  correctCount: 700,
  attemptRows: [],
  submittedCount: 5,
  sessionRows: [],
  topicRows: [],
  reportRow: null,
};

test("headline totals come from exact COUNT aggregates, not the bounded row scan", async () => {
  // Only 2 recent rows are scanned, but the exact counts are 1000 / 700.
  const rows = [
    { id: "a1", is_correct: true, score: 1, created_at: "2026-01-02", questions: { marks: 1, topic_id: "t1", question_text: "q", grade: 9, topics: { name: "T", slug: "t" } } },
    { id: "a2", is_correct: false, score: 0, created_at: "2026-01-01", questions: { marks: 1, topic_id: "t1", question_text: "q", grade: 9, topics: { name: "T", slug: "t" } } },
  ];
  const progress = await loadLearnerProgress(fakeClient({ ...base, attemptRows: rows }), "L");
  expect(progress.error).toBe(false);
  expect(progress.totalAttempts).toBe(1000); // exact count, not rows.length (2)
  expect(progress.totalQuizzes).toBe(5); // submitted-session count
  expect(progress.recentActivity.length).toBeLessThanOrEqual(6);
});

test("accuracy uses the exact counts when there are no submitted sessions", async () => {
  const progress = await loadLearnerProgress(
    fakeClient({ ...base, submittedCount: 0, sessionRows: [] }),
    "L",
  );
  expect(progress.averageBasis).toBe("attempts");
  expect(progress.averageScore).toBe(70); // 700 / 1000
});

test("a hard error on the totals query surfaces error state", async () => {
  const client = {
    from: () => ({
      select: () => ({
        eq: () => ({ then: (ok: (v: unknown) => unknown) => Promise.resolve({ data: null, count: null, error: { message: "boom" } }).then(ok) }),
      }),
    }),
  } as unknown as SupabaseClient;
  const progress = await loadLearnerProgress(client, "L");
  expect(progress.error).toBe(true);
});
