import { test, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/auth/require-role", () => ({
  requireRole: vi.fn(async () => ({ id: "admin1", profile: { role: "admin" } })),
}));

vi.mock("next/navigation", () => ({
  redirect: (url: string) => {
    throw new Error("REDIRECT:" + url);
  },
}));

// Configurable service-role client: `topicGrade` is what topics lookup returns
// (null => topic not found); insert/update record whether they ran.
let topicGrade: number | null = 9;
const inserted: unknown[] = [];
const updated: unknown[] = [];

function makeAdmin() {
  return {
    from(table: string) {
      if (table === "topics") {
        return {
          select: () => ({
            eq: () => ({
              maybeSingle: async () => ({ data: topicGrade === null ? null : { grade: topicGrade }, error: null }),
            }),
          }),
        };
      }
      // questions
      return {
        insert: async (values: unknown) => {
          inserted.push(values);
          return { error: null };
        },
        update: (values: unknown) => ({
          eq: async () => {
            updated.push(values);
            return { error: null };
          },
        }),
      };
    },
  };
}

vi.mock("@/lib/supabase/server", () => ({
  createServiceRoleClient: vi.fn(() => makeAdmin()),
}));

import { createQuestion, updateQuestion } from "@/app/admin/questions/actions";
import type { QuestionInput } from "@/components/admin/QuestionForm";

function input(over: Partial<QuestionInput> = {}): QuestionInput {
  return {
    topic_id: "t-1",
    grade: 9,
    question_text: "Factorise x^2 - 9",
    answer_text: "(x-3)(x+3)",
    hint: "Difference of two squares",
    difficulty: "medium",
    marks: 2,
    solution_steps: ["a^2 - b^2 = (a-b)(a+b)"],
    is_active: true,
    ...over,
  } as QuestionInput;
}

beforeEach(() => {
  topicGrade = 9;
  inserted.length = 0;
  updated.length = 0;
});

test("createQuestion: a topic matching the grade inserts and redirects", async () => {
  topicGrade = 9;
  await expect(createQuestion(input({ grade: 9 }))).rejects.toThrow("REDIRECT:/admin/questions");
  expect(inserted).toHaveLength(1);
});

test("createQuestion: a topic from a different grade is rejected, no insert", async () => {
  topicGrade = 9; // topic is Grade 9
  const result = await createQuestion(input({ grade: 10 })); // filed under Grade 10
  expect(result).toEqual({ error: expect.stringContaining("different grade") });
  expect(inserted).toHaveLength(0);
});

test("createQuestion: an unknown topic is rejected, no insert", async () => {
  topicGrade = null;
  const result = await createQuestion(input({ grade: 9 }));
  expect(result).toEqual({ error: expect.stringContaining("no longer exists") });
  expect(inserted).toHaveLength(0);
});

test("updateQuestion: a topic matching the grade updates and redirects", async () => {
  topicGrade = 10;
  await expect(updateQuestion("q-1", input({ grade: 10 }))).rejects.toThrow("REDIRECT:/admin/questions");
  expect(updated).toHaveLength(1);
});

test("updateQuestion: a topic from a different grade is rejected, no update", async () => {
  topicGrade = 10; // topic is Grade 10
  const result = await updateQuestion("q-1", input({ grade: 9 })); // filed under Grade 9
  expect(result).toEqual({ error: expect.stringContaining("different grade") });
  expect(updated).toHaveLength(0);
});

test("updateQuestion: an invalid grade is rejected before any topic lookup", async () => {
  const result = await updateQuestion("q-1", input({ grade: 8 as unknown as QuestionInput["grade"] }));
  expect(result).toEqual({ error: expect.stringContaining("Grade 9 or Grade 10") });
  expect(updated).toHaveLength(0);
});
