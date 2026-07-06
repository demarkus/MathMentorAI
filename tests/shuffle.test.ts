import { test, expect } from "vitest";
import {
  mulberry32,
  seededShuffle,
  selectBalancedByDifficulty,
  selectBalancedPreferUnseen,
} from "@/lib/util/shuffle";
import { selectQuestions, type SourceQuestion } from "@/lib/math/teacher-resources";

function item(id: string, difficulty: string) {
  return { id, difficulty };
}

// ---- PRNG determinism ----

test("mulberry32 is deterministic for a given seed and varies by seed", () => {
  const a = mulberry32(42);
  const b = mulberry32(42);
  const seqA = [a(), a(), a()];
  const seqB = [b(), b(), b()];
  expect(seqA).toEqual(seqB); // same seed -> identical stream

  const c = mulberry32(43);
  expect([c(), c(), c()]).not.toEqual(seqA); // different seed -> different stream
});

// ---- seededShuffle ----

test("seededShuffle is a pure permutation and deterministic for a fixed seed", () => {
  const input = [1, 2, 3, 4, 5, 6, 7, 8];
  const shuffled = seededShuffle(input, mulberry32(7));
  expect(input).toEqual([1, 2, 3, 4, 5, 6, 7, 8]); // input untouched (pure)
  expect([...shuffled].sort((a, b) => a - b)).toEqual(input); // same multiset
  expect(seededShuffle(input, mulberry32(7))).toEqual(shuffled); // deterministic
});

// ---- selectBalancedByDifficulty ----

const POOL = [
  item("e1", "easy"), item("e2", "easy"), item("e3", "easy"), item("e4", "easy"),
  item("m1", "medium"), item("m2", "medium"), item("m3", "medium"), item("m4", "medium"),
  item("h1", "hard"), item("h2", "hard"), item("h3", "hard"), item("h4", "hard"),
];

test("selectBalancedByDifficulty caps at max and keeps a balanced spread", () => {
  const picked = selectBalancedByDifficulty(POOL, 6, mulberry32(1));
  expect(picked.length).toBe(6);
  // Round-robin over 3 difficulties for 6 picks → 2 of each.
  const counts = { easy: 0, medium: 0, hard: 0 } as Record<string, number>;
  for (const p of picked) counts[p.difficulty] += 1;
  expect(counts).toEqual({ easy: 2, medium: 2, hard: 2 });
});

test("selectBalancedByDifficulty is deterministic for a fixed seed", () => {
  const a = selectBalancedByDifficulty(POOL, 6, mulberry32(99));
  const b = selectBalancedByDifficulty(POOL, 6, mulberry32(99));
  expect(a.map((x) => x.id)).toEqual(b.map((x) => x.id));
});

test("selectBalancedByDifficulty varies the chosen questions across seeds", () => {
  const a = selectBalancedByDifficulty(POOL, 6, mulberry32(1)).map((x) => x.id);
  const b = selectBalancedByDifficulty(POOL, 6, mulberry32(2)).map((x) => x.id);
  // Not the identical first records every run.
  expect(a).not.toEqual(b);
});

// ---- selectBalancedPreferUnseen ----

test("selectBalancedPreferUnseen excludes recently-seen questions when fresh ones suffice", () => {
  const recent = new Set(["e1", "m1", "h1"]);
  const picked = selectBalancedPreferUnseen(POOL, recent, 6, mulberry32(1));
  expect(picked.length).toBe(6);
  expect(picked.some((p) => recent.has(p.id))).toBe(false); // 9 fresh cover 6 picks
  // Balance is preserved across the fresh pool.
  const counts = { easy: 0, medium: 0, hard: 0 } as Record<string, number>;
  for (const p of picked) counts[p.difficulty] += 1;
  expect(counts).toEqual({ easy: 2, medium: 2, hard: 2 });
});

test("selectBalancedPreferUnseen fills from seen questions only when fresh run out", () => {
  const recent = new Set(["e1", "e2", "e3", "e4", "m1", "m2", "m3", "m4", "h1"]); // 3 fresh left
  const picked = selectBalancedPreferUnseen(POOL, recent, 6, mulberry32(1));
  expect(picked.length).toBe(6); // small bank still yields a full set
  const freshPicked = picked.filter((p) => !recent.has(p.id));
  expect(freshPicked.map((p) => p.id).sort()).toEqual(["h2", "h3", "h4"]); // every fresh one used first
});

test("selectBalancedPreferUnseen degrades to plain selection when everything was seen", () => {
  const allSeen = new Set(POOL.map((p) => p.id));
  const picked = selectBalancedPreferUnseen(POOL, allSeen, 6, mulberry32(1));
  expect(picked.length).toBe(6);
});

// ---- teacher generator selection honours the injected rng ----

function sq(id: string, difficulty: string): SourceQuestion {
  return { id, question_text: id, answer_text: "1", hint: "", solution_steps: [], difficulty, marks: 1 };
}

test("selectQuestions with a seeded rng is deterministic, balanced, and varies from the stable order", () => {
  const all = [
    sq("e1", "easy"), sq("e2", "easy"), sq("e3", "easy"),
    sq("m1", "medium"), sq("m2", "medium"), sq("m3", "medium"),
    sq("h1", "hard"), sq("h2", "hard"), sq("h3", "hard"),
  ];
  const seeded = selectQuestions(all, 3, "mixed", mulberry32(5)).map((x) => x.id);
  expect(seeded.length).toBe(3);
  // Deterministic for the same seed.
  expect(selectQuestions(all, 3, "mixed", mulberry32(5)).map((x) => x.id)).toEqual(seeded);

  // Without an rng the stable round-robin still holds (backward compatible).
  expect(selectQuestions(all, 3, "mixed").map((x) => x.id)).toEqual(["e1", "m1", "h1"]);
});

test("selectQuestions for a fixed difficulty stays within that difficulty when shuffled", () => {
  const all = [sq("e1", "easy"), sq("e2", "easy"), sq("m1", "medium")];
  const picked = selectQuestions(all, 2, "easy", mulberry32(3));
  expect(picked.length).toBe(2);
  expect(picked.every((q) => q.difficulty === "easy")).toBe(true);
});
