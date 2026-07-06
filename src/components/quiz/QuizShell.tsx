"use client";

import { useRef, useState } from "react";
import { QuestionCard } from "./QuestionCard";
import { AnswerInput } from "./AnswerInput";
import { QuizProgress } from "./QuizProgress";
import { WorkedSteps, HintBox } from "./Explanation";
import { describeExpectedAnswer } from "@/lib/math/answer-format";
import { formatQuestion } from "@/lib/math/format-question";

export type QuizShellQuestion = {
  id: string;
  question_text: string;
  difficulty: string;
  marks: number;
  topicName?: string;
  grade?: number;
};

export type QuizAnswer = { questionId: string; answer: string };

/** Result of the trusted per-question check (reveal mode). Answers are never
 * shipped to the client up front; they are returned by onCheck after scoring. */
export type QuizCheckResult = {
  isCorrect: boolean;
  correctAnswer: string;
  explanation: string[];
  hint: string;
};

/**
 * Stateful, one-question-at-a-time quiz container with Previous/Next navigation
 * and a final submit. `onSubmit` (a server action) marks answers authoritatively
 * and, on success, is expected to redirect.
 *
 * Two modes:
 * - default (diagnostic): answers are collected and submitted; correct answers
 *   are never sent to the client.
 * - reveal (practice): "Check answer" calls `onCheck` (a trusted server action)
 *   which scores the answer server-side and returns the correct answer and
 *   explanation to reveal. Answer keys are not present in the client bundle.
 */
export function QuizShell({
  questions,
  onSubmit,
  onCheck,
  submitLabel = "Submit",
  reveal = false,
}: {
  questions: QuizShellQuestion[];
  onSubmit: (answers: QuizAnswer[], submissionKey: string) => Promise<{ error?: string } | void>;
  onCheck?: (questionId: string, answer: string) => Promise<QuizCheckResult | { error?: string }>;
  submitLabel?: string;
  reveal?: boolean;
}) {
  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [checks, setChecks] = useState<Record<string, QuizCheckResult>>({});
  const [checking, setChecking] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Stable idempotency key for this attempt — a retry reuses it so the trusted
  // finalize returns the existing result instead of duplicating.
  const [submissionKey] = useState(() => crypto.randomUUID());
  // Synchronous guard: `saving` state updates asynchronously, so two submits in
  // the same tick (e.g. Enter + click) could both pass a state-only check and
  // fire onSubmit twice. This ref blocks concurrent submits deterministically.
  const submittingRef = useRef(false);

  const question = questions[index];
  const isLast = index === questions.length - 1;
  // Answered status per question, derived from the single `answers` source of
  // truth so the strip, counter, and submit warning can never disagree.
  const answeredIds = new Set(
    questions.filter((item) => (answers[item.id] ?? "").trim().length > 0).map((item) => item.id),
  );
  const answeredCount = answeredIds.size;
  const check = checks[question.id];
  const isRevealed = reveal && Boolean(check);

  function setAnswer(value: string) {
    setAnswers((prev) => ({ ...prev, [question.id]: value }));
  }
  function goPrev() {
    setError(null);
    setIndex((value) => Math.max(0, value - 1));
  }
  function goNext() {
    setError(null);
    setIndex((value) => Math.min(questions.length - 1, value + 1));
  }
  function goTo(target: number) {
    setError(null);
    setIndex(Math.min(questions.length - 1, Math.max(0, target)));
  }

  async function checkCurrent() {
    if (!onCheck || checking || checks[question.id]) return;
    setChecking(true);
    setError(null);
    try {
      const result = await onCheck(question.id, answers[question.id] ?? "");
      if ("isCorrect" in result) {
        setChecks((prev) => ({ ...prev, [question.id]: result }));
      } else {
        setError(result.error ?? "We couldn’t check your answer. Please try again.");
      }
    } catch {
      setError("We couldn’t check your answer just now. Please try again.");
    } finally {
      setChecking(false);
    }
  }

  async function handleSubmit() {
    if (submittingRef.current || saving) return; // guard against double submission
    // Warn before submitting with blanks. window.confirm blocks synchronously,
    // so no competing submit can slip in before the guard below is set.
    const unanswered = questions.length - answeredCount;
    if (unanswered > 0) {
      const proceed = window.confirm(
        `You have ${unanswered} unanswered question${unanswered === 1 ? "" : "s"}. Submit anyway?`,
      );
      if (!proceed) return;
    }
    submittingRef.current = true;
    setSaving(true);
    setError(null);
    try {
      const payload: QuizAnswer[] = questions.map((item) => ({
        questionId: item.id,
        answer: answers[item.id] ?? "",
      }));
      const result = await onSubmit(payload, submissionKey);
      if (result?.error) {
        setError(result.error);
        setSaving(false);
        submittingRef.current = false;
      }
    } catch {
      setError("Something went wrong submitting your answers. Please try again.");
      setSaving(false);
      submittingRef.current = false;
    }
  }

  function onEnter() {
    if (reveal && !isRevealed) {
      void checkCurrent();
    } else if (!isLast) {
      goNext();
    } else {
      void handleSubmit();
    }
  }

  const primaryClass = "rounded-xl bg-brand px-5 py-3 font-semibold text-white disabled:opacity-50";
  let primaryButton;
  if (reveal && !isRevealed) {
    primaryButton = (
      <button type="button" onClick={checkCurrent} disabled={saving || checking} className={primaryClass}>
        {checking ? "Checking…" : "Check answer"}
      </button>
    );
  } else if (!isLast) {
    primaryButton = (
      <button type="button" onClick={goNext} disabled={saving} className={primaryClass}>
        Next
      </button>
    );
  } else {
    primaryButton = (
      <button type="button" onClick={handleSubmit} disabled={saving} className={primaryClass}>
        {saving ? "Submitting…" : submitLabel}
      </button>
    );
  }

  return (
    <div className="rounded-3xl border border-line bg-white p-6 md:p-9">
      <QuizProgress current={index} total={questions.length} answered={answeredCount} />

      <nav aria-label="Quiz questions" className="mt-5">
        <ol className="flex flex-wrap gap-2">
          {questions.map((item, itemIndex) => {
            const isCurrent = itemIndex === index;
            const isAnswered = answeredIds.has(item.id);
            return (
              <li key={item.id}>
                <button
                  type="button"
                  onClick={() => goTo(itemIndex)}
                  disabled={saving}
                  aria-label={`Question ${itemIndex + 1}, ${isAnswered ? "answered" : "unanswered"}`}
                  aria-current={isCurrent ? "step" : undefined}
                  className={`h-9 w-9 rounded-full text-sm font-semibold transition-colors disabled:opacity-40 ${
                    isAnswered
                      ? "bg-brand text-white hover:bg-brand-dark"
                      : "border border-line bg-white text-muted hover:border-brand/40"
                  } ${isCurrent ? "ring-2 ring-brand ring-offset-2" : ""}`}
                >
                  {itemIndex + 1}
                </button>
              </li>
            );
          })}
        </ol>
      </nav>

      <div className="mt-8">
        <QuestionCard
          difficulty={question.difficulty}
          marks={question.marks}
          topicName={question.topicName}
          grade={question.grade}
          questionText={question.question_text}
          expectedAnswerNote={describeExpectedAnswer(question.question_text)}
        >
          <div className="mt-8">
            <AnswerInput
              value={answers[question.id] ?? ""}
              onChange={setAnswer}
              onEnter={onEnter}
              disabled={saving || isRevealed}
            />
          </div>
        </QuestionCard>
      </div>

      {isRevealed && check && (
        <div
          role="status"
          className={`mt-6 space-y-3 rounded-xl p-4 text-sm ${
            check.isCorrect ? "bg-green-50 text-green-900" : "bg-amber-50 text-amber-950"
          }`}
        >
          <p className="font-semibold">
            {check.isCorrect ? "Correct — nicely done!" : "Not quite — let's work through it together."}
          </p>

          {!check.isCorrect && (
            <p>
              Your answer:{" "}
              <span className="font-mono font-semibold">{formatQuestion((answers[question.id] ?? "").trim()) || "—"}</span>
            </p>
          )}
          <p>
            {check.isCorrect ? "Accepted answer" : "Correct answer"}:{" "}
            <span className="font-mono font-semibold">{formatQuestion(check.correctAnswer)}</span>
          </p>

          {!check.isCorrect && check.hint && <HintBox hint={check.hint} className="bg-white/60" />}

          <div>
            <p className="font-semibold">Worked steps</p>
            <WorkedSteps steps={check.explanation} className="mt-1" />
          </div>

          {!check.isCorrect && (
            <p className="text-xs">
              Take a moment to review the steps above — you can retry this topic anytime.
            </p>
          )}
        </div>
      )}

      {error && <p className="mt-6 rounded-xl bg-red-50 p-4 text-sm text-red-700">{error}</p>}

      <div className="mt-8 flex items-center justify-between gap-3">
        <button
          type="button"
          onClick={goPrev}
          disabled={index === 0 || saving}
          className="rounded-xl border border-line px-5 py-3 font-semibold text-foreground disabled:opacity-40"
        >
          Previous
        </button>
        {primaryButton}
      </div>
    </div>
  );
}
