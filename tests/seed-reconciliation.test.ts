import { describe, test, expect, beforeEach } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { PGlite } from "@electric-sql/pglite";

/**
 * Regression tests for supabase/seed.sql's baseline reconciliation.
 *
 * These run the REAL seed file against an in-process Postgres (pglite) — no
 * external Supabase project, fully deterministic, offline, CI-safe. They prove
 * the seed is NON-DESTRUCTIVE: it reconciles only the known baseline fingerprint
 * and never touches custom admin content or attempted rows.
 */

const SEED_SQL = readFileSync(join(process.cwd(), "supabase/seed.sql"), "utf8");

// The minimal slice of the real schema the seed touches. Mirrors the columns and
// constraints from 20260630012144_initial_math_mentor_schema.sql that matter here.
const SCHEMA_SQL = `
  create type public.question_difficulty as enum ('easy', 'medium', 'hard');

  create table public.topics (
    id uuid primary key default gen_random_uuid(),
    grade integer not null check (grade in (9, 10)),
    name text not null,
    slug text not null,
    description text,
    curriculum_tag text,
    display_order integer not null default 0,
    unique (grade, slug)
  );

  create table public.questions (
    id uuid primary key default gen_random_uuid(),
    topic_id uuid not null references public.topics(id) on delete cascade,
    grade integer not null check (grade in (9, 10)),
    question_text text not null,
    answer_text text not null,
    hint text,
    solution_steps jsonb not null default '[]'::jsonb,
    difficulty public.question_difficulty not null default 'easy',
    cognitive_level text not null default 'routine procedure',
    marks integer not null default 1,
    is_active boolean not null default true
  );

  create table public.attempts (
    id uuid primary key default gen_random_uuid(),
    question_id uuid references public.questions(id) on delete cascade
  );
`;

/** Inserts a topic and returns its id. */
async function addTopic(
  db: PGlite,
  t: { grade: number; name: string; slug: string; order?: number },
): Promise<string> {
  const res = await db.query<{ id: string }>(
    `insert into public.topics (grade, name, slug, description, curriculum_tag, display_order)
     values ($1, $2, $3, 'fixture', 'CAPS', $4) returning id`,
    [t.grade, t.name, t.slug, t.order ?? 1],
  );
  return res.rows[0].id;
}

async function addQuestion(
  db: PGlite,
  q: { topicId: string; grade: number; text: string; answer: string; hint: string },
): Promise<string> {
  const res = await db.query<{ id: string }>(
    `insert into public.questions (topic_id, grade, question_text, answer_text, hint, difficulty, marks)
     values ($1, $2, $3, $4, $5, 'medium', 2) returning id`,
    [q.topicId, q.grade, q.text, q.answer, q.hint],
  );
  return res.rows[0].id;
}

async function count(db: PGlite, sql: string, params: unknown[] = []): Promise<number> {
  const res = await db.query<{ n: number }>(sql, params);
  return Number(res.rows[0].n);
}

describe("seed.sql baseline reconciliation", () => {
  let db: PGlite;

  beforeEach(async () => {
    db = new PGlite();
    await db.exec(SCHEMA_SQL);

    // --- Baseline topics (as seeded by the initial migration) ---
    const g9Fact = await addTopic(db, { grade: 9, name: "Factorisation", slug: "factorisation" });
    const g10Fact = await addTopic(db, { grade: 10, name: "Factorisation", slug: "factorisation" });
    const exam = await addTopic(db, { grade: 10, name: "Exam-style revision", slug: "exam-revision", order: 5 });

    // Superseded baseline row (unicode) — unattempted → should be reconciled away.
    await addQuestion(db, {
      topicId: g9Fact, grade: 9,
      text: "Factorise: x² - 9", answer: "(x-3)(x+3)", hint: "Use difference of squares.",
    });
    // Identical-text baseline row — NOT in the allow-list → must survive untouched.
    await addQuestion(db, {
      topicId: g9Fact, grade: 9,
      text: "Factorise: 6x + 12", answer: "6(x+2)", hint: "Find the highest common factor.",
    });
    // Superseded baseline row WITH an attempt → history must be preserved.
    const attempted = await addQuestion(db, {
      topicId: g10Fact, grade: 10,
      text: "Factorise: 4x² - 25", answer: "(2x-5)(2x+5)", hint: "Use difference of squares.",
    });
    await db.query(`insert into public.attempts (question_id) values ($1)`, [attempted]);
    // Baseline exam-revision question (unattempted) → removed, leaving the topic empty.
    await addQuestion(db, {
      topicId: exam, grade: 10,
      text: "Solve: x² - 5x + 6 = 0", answer: "x=2orx=3", hint: "Factorise, then use the zero-product rule.",
    });

    // --- Custom admin content that must NEVER be reconciled away ---
    await addTopic(db, { grade: 9, name: "My Custom Empty Topic", slug: "custom-empty" });
    const customFull = await addTopic(db, { grade: 10, name: "My Custom Topic", slug: "custom-full" });
    await addQuestion(db, {
      topicId: customFull, grade: 10,
      text: "Custom: prove the quadratic formula", answer: "see steps", hint: "complete the square",
    });
  });

  test("a custom unattempted question survives reconciliation", async () => {
    await db.exec(SEED_SQL);
    expect(await count(db, `select count(*) n from public.questions where question_text = $1`,
      ["Custom: prove the quadratic formula"])).toBe(1);
  });

  test("a custom empty topic survives reconciliation", async () => {
    await db.exec(SEED_SQL);
    expect(await count(db, `select count(*) n from public.topics where slug = 'custom-empty'`)).toBe(1);
  });

  test("a superseded baseline row is reconciled to the canonical caret form", async () => {
    await db.exec(SEED_SQL);
    // Unicode baseline removed…
    expect(await count(db, `select count(*) n from public.questions where question_text = $1`,
      ["Factorise: x² - 9"])).toBe(0);
    // …canonical caret form present exactly once.
    expect(await count(db, `select count(*) n from public.questions where question_text = $1`,
      ["Factorise: x^2 - 9"])).toBe(1);
  });

  test("an identical-text baseline row is left untouched (no churn, no duplicate)", async () => {
    await db.exec(SEED_SQL);
    expect(await count(db, `select count(*) n from public.questions where question_text = $1`,
      ["Factorise: 6x + 12"])).toBe(1);
  });

  test("an attempted baseline row survives even though it matches the fingerprint", async () => {
    await db.exec(SEED_SQL);
    expect(await count(db, `select count(*) n from public.questions where question_text = $1`,
      ["Factorise: 4x² - 25"])).toBe(1);
  });

  test("the known baseline exam-revision topic is removed once empty", async () => {
    await db.exec(SEED_SQL);
    expect(await count(db, `select count(*) n from public.topics where slug = 'exam-revision'`)).toBe(0);
  });

  test("re-running the seed creates no canonical duplicates", async () => {
    await db.exec(SEED_SQL);
    const questionsAfterFirst = await count(db, `select count(*) n from public.questions`);
    const topicsAfterFirst = await count(db, `select count(*) n from public.topics`);

    await db.exec(SEED_SQL);
    const questionsAfterSecond = await count(db, `select count(*) n from public.questions`);
    const topicsAfterSecond = await count(db, `select count(*) n from public.topics`);

    expect(questionsAfterSecond).toBe(questionsAfterFirst);
    expect(topicsAfterSecond).toBe(topicsAfterFirst);
    // The canonical row exists exactly once after a second pass.
    expect(await count(db, `select count(*) n from public.questions where question_text = $1`,
      ["Factorise: x^2 - 9"])).toBe(1);
    // Custom content still intact after repeated runs.
    expect(await count(db, `select count(*) n from public.topics where slug = 'custom-empty'`)).toBe(1);
    expect(await count(db, `select count(*) n from public.questions where question_text = $1`,
      ["Custom: prove the quadratic formula"])).toBe(1);
  });
});
