/**
 * Deterministic, testable randomness for question selection.
 *
 * Production passes a crypto-seeded RNG (see {@link cryptoRng}) so practice runs
 * and generated worksheets vary. Tests pass a fixed-seed RNG (see
 * {@link mulberry32}) so selection is fully deterministic and assertable. None of
 * these touch answer keys — selection operates on ids/difficulty only, on the
 * server.
 */

/** A pure PRNG factory (mulberry32). Same seed → same sequence of [0, 1) values. */
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return function () {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** A cryptographically-seeded value for production randomness (falls back safely). */
export function cryptoSeed(): number {
  const g = globalThis as { crypto?: { getRandomValues?: (array: Uint32Array) => Uint32Array } };
  if (g.crypto?.getRandomValues) {
    const buffer = new Uint32Array(1);
    g.crypto.getRandomValues(buffer);
    return buffer[0] >>> 0;
  }
  // Only if WebCrypto is unavailable (should not happen on a supported runtime).
  return (Date.now() ^ (Date.now() << 11)) >>> 0;
}

/** A production RNG: a mulberry32 stream seeded from crypto. */
export function cryptoRng(): () => number {
  return mulberry32(cryptoSeed());
}

/** Fisher–Yates shuffle using an injected RNG. Pure — returns a new array. */
export function seededShuffle<T>(items: T[], rng: () => number): T[] {
  const out = items.slice();
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    const tmp = out[i];
    out[i] = out[j];
    out[j] = tmp;
  }
  return out;
}

const DIFFICULTY_ORDER = ["easy", "medium", "hard"] as const;

/**
 * Picks up to `max` items, keeping difficulty balance while varying WHICH items
 * are chosen. Each difficulty bucket is shuffled by `rng`, then the buckets are
 * round-robined easy → medium → hard (unknown difficulties round-robin last), so
 * the result is balanced but no longer the identical first records every run.
 * Deterministic for a fixed-seed rng; pure.
 */
export function selectBalancedByDifficulty<T extends { difficulty: string }>(
  items: T[],
  max: number,
  rng: () => number,
): T[] {
  const buckets: T[][] = DIFFICULTY_ORDER.map((level) =>
    seededShuffle(items.filter((item) => item.difficulty === level), rng),
  );
  const known = new Set<string>(DIFFICULTY_ORDER);
  const others = seededShuffle(items.filter((item) => !known.has(item.difficulty)), rng);
  if (others.length > 0) buckets.push(others);

  const out: T[] = [];
  let added = true;
  while (added && out.length < max) {
    added = false;
    for (const bucket of buckets) {
      const next = bucket.shift();
      if (next) {
        out.push(next);
        added = true;
        if (out.length >= max) break;
      }
    }
  }
  return out;
}

/**
 * Like {@link selectBalancedByDifficulty}, but questions the learner attempted
 * recently are only used to FILL a set that fresh questions can't complete.
 * With a bank larger than `max`, consecutive runs therefore rotate through the
 * unseen questions first instead of re-drawing the same ones; with a small
 * bank it degrades gracefully to the plain balanced selection. Pure.
 */
export function selectBalancedPreferUnseen<T extends { id: string; difficulty: string }>(
  items: T[],
  recentIds: ReadonlySet<string>,
  max: number,
  rng: () => number,
): T[] {
  const fresh = items.filter((item) => !recentIds.has(item.id));
  const seen = items.filter((item) => recentIds.has(item.id));
  const picked = selectBalancedByDifficulty(fresh, max, rng);
  if (picked.length >= max || seen.length === 0) return picked;
  return [...picked, ...selectBalancedByDifficulty(seen, max - picked.length, rng)];
}
