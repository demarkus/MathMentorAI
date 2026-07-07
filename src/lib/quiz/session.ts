import type { SupabaseClient } from "@supabase/supabase-js";
import { MAX_ACTIVE_ISSUED_SESSIONS } from "./limits";

/**
 * Trusted quiz-session helpers. All writes go through the service-role client
 * (the client cannot INSERT attempts/quiz_sessions/reports directly) and the
 * finalize step runs the atomic, idempotent finalize_quiz_submission function.
 */

export type QuizType = "diagnostic" | "practice";
export type ReportType = "diagnostic" | "practice" | "progress";

export type IssuedSession = {
  id: string;
  learnerId: string;
  quizType: string;
  topicId: string | null;
  grade: number | null;
  questionIds: string[];
  status: string | null;
  expiresAt: string | null;
};

/** Default issued-session lifetime (minutes). Mirrors the DB safety-net default. */
export const SESSION_TTL_MINUTES = 120;

export type FinalizeAttempt = {
  questionId: string;
  submitted: string;
  isCorrect: boolean;
  score: number;
};

/** A learner's currently-active (issued, unexpired) session, for the reuse/cap decision. */
export type ActiveSessionRow = {
  id: string;
  quizType: string;
  topicId: string | null;
  grade: number | null;
  createdAt: string;
};

/**
 * How long a matching active session still counts as "the same start" and is
 * reused. Within this window a refresh or double-click resumes the identical
 * set; beyond it the learner has abandoned the run (answers only ever live in
 * the browser, so there is nothing to resume) and a restart supersedes it with
 * a freshly-selected set.
 */
export const SESSION_REUSE_GRACE_MS = 2 * 60_000;

/** The outcome of the reuse/supersede/cap decision. */
export type SessionStartDecision =
  | { kind: "reuse"; sessionId: string }
  | { kind: "create"; supersededIds: string[] }
  | { kind: "at_limit" };

/**
 * Pure decision for starting a session, given the learner's active issued
 * sessions. A matching session (same type + topic + grade) younger than
 * {@link SESSION_REUSE_GRACE_MS} is reused (refresh / double-click); an older
 * match is superseded — expired and replaced with a fresh set. Superseded
 * matches free their slot, so only unrelated active sessions count toward the
 * `max` abuse cap. Injectable and side-effect-free for testing.
 */
export function chooseSessionStart(
  active: ActiveSessionRow[],
  want: { quizType: QuizType; topicId: string | null; grade: number | null },
  max: number = MAX_ACTIVE_ISSUED_SESSIONS,
  nowMs: number = Date.now(),
): SessionStartDecision {
  const matches = active.filter(
    (s) => s.quizType === want.quizType && s.topicId === want.topicId && s.grade === want.grade,
  );
  // An unparseable createdAt compares as stale (NaN), so it gets superseded.
  const fresh = matches.find((s) => nowMs - Date.parse(s.createdAt) < SESSION_REUSE_GRACE_MS);
  if (fresh) return { kind: "reuse", sessionId: fresh.id };
  if (active.length - matches.length >= max) return { kind: "at_limit" };
  return { kind: "create", supersededIds: matches.map((s) => s.id) };
}

/**
 * Persists the exact issued question set as a new session and returns its id.
 * A matching session started moments ago is reused (refresh/double-click); an
 * older abandoned match is expired and replaced with the fresh set. Returns
 * null when the learner is at the active-session cap or the insert fails.
 * Bounds the number of simultaneously-issued sessions per learner.
 */
export async function startSession(
  admin: SupabaseClient,
  params: {
    learnerId: string;
    quizType: QuizType;
    topicId?: string | null;
    grade?: number | null;
    questionIds: string[];
    ttlMinutes?: number;
  },
): Promise<string | null> {
  const ttl = params.ttlMinutes ?? SESSION_TTL_MINUTES;
  const nowIso = new Date().toISOString();
  const expiresAt = new Date(Date.now() + ttl * 60_000).toISOString();

  // Look at the learner's active (issued, unexpired) sessions to decide.
  const { data: activeData } = await admin
    .from("quiz_sessions")
    .select("id, quiz_type, topic_id, grade, created_at")
    .eq("learner_id", params.learnerId)
    .eq("status", "issued")
    .gt("expires_at", nowIso)
    .order("created_at", { ascending: false })
    .limit(MAX_ACTIVE_ISSUED_SESSIONS + 1);

  const active: ActiveSessionRow[] = ((activeData ?? []) as {
    id: string;
    quiz_type: string;
    topic_id: string | null;
    grade: number | null;
    created_at: string;
  }[]).map((row) => ({
    id: row.id,
    quizType: row.quiz_type,
    topicId: row.topic_id,
    grade: row.grade,
    createdAt: row.created_at,
  }));

  const decision = chooseSessionStart(active, {
    quizType: params.quizType,
    topicId: params.topicId ?? null,
    grade: params.grade ?? null,
  });
  if (decision.kind === "reuse") return decision.sessionId;
  if (decision.kind === "at_limit") return null;

  // Expire the abandoned matches being replaced. Best-effort: if this fails
  // they simply linger until their TTL / the scheduled cleanup — never blocks
  // issuing the fresh set. status stays 'issued' so cleanup semantics apply.
  if (decision.supersededIds.length > 0) {
    await admin
      .from("quiz_sessions")
      .update({ expires_at: new Date(Date.now() - 1000).toISOString() })
      .in("id", decision.supersededIds)
      .eq("status", "issued");
  }

  const { data, error } = await admin
    .from("quiz_sessions")
    .insert({
      learner_id: params.learnerId,
      quiz_type: params.quizType,
      status: "issued",
      topic_id: params.topicId ?? null,
      grade: params.grade ?? null,
      question_ids: params.questionIds,
      expires_at: expiresAt,
    })
    .select("id")
    .single();
  if (error || !data) return null;
  return (data as { id: string }).id;
}

/** Loads a session and confirms it belongs to the given learner (else null). */
export async function loadSession(
  admin: SupabaseClient,
  sessionId: string,
  learnerId: string,
): Promise<IssuedSession | null> {
  const { data, error } = await admin
    .from("quiz_sessions")
    .select("id, learner_id, quiz_type, topic_id, grade, question_ids, status, expires_at")
    .eq("id", sessionId)
    .maybeSingle();
  if (error || !data) return null;
  const row = data as {
    id: string;
    learner_id: string;
    quiz_type: string;
    topic_id: string | null;
    grade: number | null;
    question_ids: string[] | null;
    status: string | null;
    expires_at: string | null;
  };
  if (row.learner_id !== learnerId) return null; // ownership
  return {
    id: row.id,
    learnerId: row.learner_id,
    quizType: row.quiz_type,
    topicId: row.topic_id,
    grade: row.grade,
    questionIds: Array.isArray(row.question_ids) ? row.question_ids : [],
    status: row.status,
    expiresAt: row.expires_at,
  };
}

/**
 * Pure guard for whether an issued session may still be started/run/first-submitted
 * for the expected quiz type. Rejects: not found (null), wrong type, already
 * submitted, or past expiry. `now` is injectable for tests.
 */
export function isSessionRunnable(
  session: IssuedSession | null,
  expectedType: QuizType,
  now: number = Date.now(),
): boolean {
  if (!session) return false;
  if (session.quizType !== expectedType) return false;
  if (session.status !== "issued") return false;
  if (session.expiresAt && new Date(session.expiresAt).getTime() < now) return false;
  return true;
}

/** True when an issued session is past its expiry. Submitted sessions are never expired for retry. */
export function isSessionExpired(session: IssuedSession, now: number = Date.now()): boolean {
  if (session.status === "submitted") return false;
  return Boolean(session.expiresAt && new Date(session.expiresAt).getTime() < now);
}

/**
 * Runs the trusted, atomic, idempotent finalize function. Returns the report id
 * (existing one on an idempotent retry), or null on failure.
 */
export async function finalizeSession(
  admin: SupabaseClient,
  params: {
    sessionId: string;
    learnerId: string;
    submissionKey: string;
    score: number;
    totalMarks: number;
    percentage: number;
    reportType: ReportType;
    reportData: unknown;
    attempts: FinalizeAttempt[];
  },
): Promise<string | null> {
  const { data, error } = await admin.rpc("finalize_quiz_submission", {
    p_session_id: params.sessionId,
    p_learner_id: params.learnerId,
    p_submission_key: params.submissionKey,
    p_score: params.score,
    p_total_marks: params.totalMarks,
    p_percentage: params.percentage,
    p_report_type: params.reportType,
    p_report_data: params.reportData,
    p_attempts: params.attempts,
  });
  if (error) return null;
  return (data as string | null) ?? null;
}

/**
 * Validates a submitted answer set against the session's issued question set:
 * exactly the issued ids, each once, no extras, no missing. Returns true on match.
 */
export function submittedMatchesIssued(submittedIds: string[], issuedIds: string[]): boolean {
  if (submittedIds.length !== issuedIds.length) return false;
  const seen = new Set<string>();
  for (const id of submittedIds) {
    if (seen.has(id)) return false; // duplicate
    seen.add(id);
  }
  const issued = new Set(issuedIds);
  for (const id of seen) {
    if (!issued.has(id)) return false; // additional / not issued
  }
  return seen.size === issued.size; // none missing
}
