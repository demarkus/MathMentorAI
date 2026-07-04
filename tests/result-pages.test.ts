import { test, expect, vi, beforeEach } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";

// requireRole is exercised elsewhere; here it just needs to resolve a learner.
vi.mock("@/lib/auth/require-role", () => ({
  requireRole: vi.fn(async () => ({ id: "u1", profile: { role: "student" } })),
}));

// redirect() throws to halt rendering; capture the destination.
vi.mock("next/navigation", () => ({
  redirect: (url: string) => {
    throw new Error("REDIRECT:" + url);
  },
}));

// A recording, chainable Supabase query builder over a single preset row.
type Row = { data: unknown; report_type: string } | null;
const eqCalls: Array<[string, unknown]> = [];
let presetRow: Row = null;
let presetError: unknown = null;

const supabaseMock = {
  from: vi.fn(() => supabaseMock),
  select: vi.fn(() => supabaseMock),
  eq: vi.fn((col: string, val: unknown) => {
    eqCalls.push([col, val]);
    return supabaseMock;
  }),
  maybeSingle: vi.fn(async () => ({ data: presetRow, error: presetError })),
};

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(async () => supabaseMock),
}));

import DiagnosticResultPage from "@/app/learner/diagnostic/result/page";
import PracticeResultPage from "@/app/learner/practice/[topicSlug]/result/page";

const DIAGNOSTIC_SUMMARY = {
  score: 5, totalMarks: 10, correct: 5, totalQuestions: 10, percentage: 50,
  weakTopics: ["Factorisation"], strongTopics: [], topics: [{ topic: "Factorisation", slug: "factorisation", correct: 1, total: 2, percentage: 50 }],
};

const PRACTICE_SUMMARY = {
  topicName: "Factorisation", topicSlug: "factorisation", grade: 9, score: 5, totalMarks: 10,
  correct: 5, totalQuestions: 10, percentage: 50, questions: [],
};

async function renderDiagnostic(searchParams: Record<string, string>) {
  const element = await DiagnosticResultPage({ searchParams: Promise.resolve(searchParams) });
  return renderToStaticMarkup(element);
}

async function renderPractice(topicSlug: string, searchParams: Record<string, string>) {
  const element = await PracticeResultPage({
    params: Promise.resolve({ topicSlug }),
    searchParams: Promise.resolve(searchParams),
  });
  return renderToStaticMarkup(element);
}

beforeEach(() => {
  eqCalls.length = 0;
  presetRow = null;
  presetError = null;
  supabaseMock.from.mockClear();
});

// ---- Diagnostic result page ----

test("diagnostic: a valid owned report renders the summary and filters by report_type", async () => {
  presetRow = { data: DIAGNOSTIC_SUMMARY, report_type: "diagnostic" };
  const html = await renderDiagnostic({ report: "r-1" });
  expect(html).toContain("50%");
  expect(eqCalls).toContainEqual(["id", "r-1"]);
  expect(eqCalls).toContainEqual(["report_type", "diagnostic"]);
});

test("diagnostic: a missing/foreign/wrong-type report id renders the empty state", async () => {
  presetRow = null; // RLS filtered it out, wrong report_type, or unknown id
  const html = await renderDiagnostic({ report: "r-does-not-exist" });
  expect(html).toContain("No results to show yet");
});

test("diagnostic: a forged ?data= payload is ignored (no fallback, no DB read)", async () => {
  const forged = Buffer.from(JSON.stringify({ ...DIAGNOSTIC_SUMMARY, percentage: 100 })).toString("base64url");
  const html = await renderDiagnostic({ data: forged });
  expect(html).toContain("No results to show yet");
  expect(html).not.toContain("100%");
  expect(supabaseMock.from).not.toHaveBeenCalled(); // no report param => no query at all
});

test("diagnostic: no params renders the empty state", async () => {
  const html = await renderDiagnostic({});
  expect(html).toContain("No results to show yet");
});

// ---- Practice result page ----

test("practice: a valid owned report on its canonical slug renders and filters by report_type", async () => {
  presetRow = { data: PRACTICE_SUMMARY, report_type: "practice" };
  const html = await renderPractice("factorisation", { report: "r-2" });
  expect(html).toContain("50%");
  expect(eqCalls).toContainEqual(["id", "r-2"]);
  expect(eqCalls).toContainEqual(["report_type", "practice"]);
});

test("practice: a report on the wrong topic slug redirects to its canonical route", async () => {
  presetRow = { data: PRACTICE_SUMMARY, report_type: "practice" }; // topicSlug = factorisation
  await expect(renderPractice("exponents", { report: "r-2" })).rejects.toThrow(
    "REDIRECT:/learner/practice/factorisation/result?report=r-2",
  );
});

test("practice: a missing/foreign/wrong-type report id renders the empty state", async () => {
  presetRow = null;
  const html = await renderPractice("factorisation", { report: "nope" });
  expect(html).toContain("No results to show yet");
});

test("practice: a forged ?data= payload is ignored (no fallback, no DB read)", async () => {
  const forged = Buffer.from(JSON.stringify({ ...PRACTICE_SUMMARY, percentage: 100 })).toString("base64url");
  const html = await renderPractice("factorisation", { data: forged });
  expect(html).toContain("No results to show yet");
  expect(html).not.toContain("100%");
  expect(supabaseMock.from).not.toHaveBeenCalled();
});
