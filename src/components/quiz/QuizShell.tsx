"use client";

import { useState } from "react";
import { QuestionCard } from "./QuestionCard";
import { AnswerInput } from "./AnswerInput";
import { QuizProgress } from "./QuizProgress";
import { WorkedSteps, HintBox } from "./Explanation";
import { isAnswerCorrect } from "@/lib/math/check-answer";
import { describeExpectedAnswer } from "@/lib/math/answer-format";

export type QuizShellQuestion = {
  id: string;
  question_text: string;
  difficulty: string;
  marks: number;
  topicName?: string;
  grade?: number;
  // Only supplied in reveal (practice) mode — used for immediate feedback.
  answerText?: string;
  hint?: string;
  explanation?: string[];
};

export type QuizAnswer = { questionId: string; answer: string };

/**
 * Stateful, one-question-at-a-time quiz container with Previous/Next navigation
 * and a final submit. `onSubmit` (a server action) marks answers authoritatively
 * and, on success, is expected to redirect.
 *
 * Two modes:
 * - default (diagnostic): answers are collected and submitted; correct answers
 *   are never sent to the client.
 * - reveal (practice): a "Check answer" step shows immediate feedback (correct/
 *   incorrect, the correct answer, and the explanation) before advancing.
 */
export function QuizShell({
  questions,
  onSubmit,
  submitLabel = "Submit",
  reveal = false,
}: {
  questions: QuizShellQuestion[];
  onSubmit: (answers: QuizAnswer[]) => Promise<{ error?: string } | void>;
  submitLabel?: string;
  reveal?: boolean;
}) {
  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [revealed, setRevealed] = useState<Record<string, boolean>>({});
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const question = questions[index];
  const isLast = index === questions.length - 1;
  const answeredCount = questions.filter((item) => (answers[item.id] ?? "").trim().length > 0).length;
  const isRevealed = reveal && Boolean(revealed[question.id]);
  const isCorrect = isRevealed && isAnswerCorrect(answers[question.id] ?? "", question.answerText ?? "");

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
  function revealCurrent() {
    setRevealed((prev) => ({ ...prev, [question.id]: true }));
  }

  async function handleSubmit() {
    if (saving) return; // guard against double submission
    setSaving(true);
    setError(null);
    try {
      const payload: QuizAnswer[] = questions.map((item) => ({
        questionId: item.id,
        answer: answers[item.id] ?? "",
      }));
      const result = await onSubmit(payload);
      if (result?.error) {
        setError(result.error);
        setSaving(false);
      }
    } catch {
      setError("Something went wrong submitting your answers. Please try again.");
      setSaving(false);
    }
  }

  function onEnter() {
    if (reveal && !isRevealed) {
      revealCurrent();
    } else if (!isLast) {
      goNext();
    } else {
      handleSubmit();
    }
  }

  const primaryClass = "rounded-xl bg-brand px-5 py-3 font-semibold text-white disabled:opacity-50";
  let primaryButton;
  if (reveal && !isRevealed) {
    primaryButton = (
      <button type="button" onClick={revealCurrent} disabled={saving} className={primaryClass}>
        Check answer
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
      <div className="mt-8">
        <QuestionCard
          difficulty={question.difficulty}
          marks={question.marks}
          topicName={question.topicName}
          grade={question.grade}
          questionText={question.question_text}
          expectedAnswerNote={describeExpectedAnswer(question.question_text, question.answerText)}
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

      {isRevealed && (
        <div
          role="status"
          className={`mt-6 space-y-3 rounded-xl p-4 text-sm ${
            isCorrect ? "bg-green-50 text-green-900" : "bg-amber-50 text-amber-950"
          }`}
        >
          <p className="font-semibold">
            {isCorrect ? "Correct — nicely done!" : "Not quite — let's work through it together."}
          </p>

          {!isCorrect && (
            <p>
              Your answer:{" "}
              <span className="font-mono font-semibold">{(answers[question.id] ?? "").trim() || "—"}</span>
            </p>
          )}
          <p>
            {isCorrect ? "Accepted answer" : "Correct answer"}:{" "}
            <span className="font-mono font-semibold">{question.answerText}</span>
          </p>

          {!isCorrect && question.hint && <HintBox hint={question.hint} className="bg-white/60" />}

          <div>
            <p className="font-semibold">Worked steps</p>
            <WorkedSteps steps={question.explanation ?? []} className="mt-1" />
          </div>

          {!isCorrect && (
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
