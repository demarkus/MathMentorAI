"use client";

import { resourceTypeLabel, type WorksheetContent } from "@/lib/math/teacher-resources";
import { formatQuestion } from "@/lib/math/format-question";

/**
 * Printable rendering of a generated resource. Chrome (the Print button) is
 * hidden when printing via `print:hidden`. Used by both the generator preview
 * and the saved-resource detail page.
 */
export function GeneratedResourceView({ content }: { content: WorksheetContent }) {
  const isMemo = content.resourceType === "memo";
  const showQuestions = !isMemo;
  const showHintWithQuestion = content.resourceType === "revision_pack";

  return (
    <div className="rounded-3xl border border-line bg-white p-6 md:p-9">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-sm font-semibold text-brand">{resourceTypeLabel(content.resourceType)}</p>
          <h2 className="mt-1 text-2xl font-semibold tracking-tight">{content.title}</h2>
          <p className="mt-2 text-sm text-muted">
            Grade {content.grade} · {content.topicName} · {content.generatedCount} question
            {content.generatedCount === 1 ? "" : "s"} · {content.totalMarks} marks
          </p>
        </div>
        <button
          type="button"
          onClick={() => window.print()}
          className="print:hidden shrink-0 rounded-xl bg-brand px-5 py-3 text-sm font-semibold text-white hover:bg-brand-dark"
        >
          Print
        </button>
      </div>

      {content.note && (
        <p className="print:hidden mt-4 rounded-xl bg-amber-50 p-3 text-sm text-amber-950">{content.note}</p>
      )}

      {showQuestions && (
        <section className="mt-8">
          <h3 className="text-lg font-semibold">Questions</h3>
          <ol className="mt-4 space-y-5">
            {content.questions.map((question) => (
              <li key={question.number} className="border-b border-line pb-5 last:border-0">
                <div className="flex items-start justify-between gap-3">
                  <p className="font-medium">
                    <span className="font-mono text-brand">{question.number}.</span> {formatQuestion(question.questionText)}
                  </p>
                  <span className="shrink-0 text-xs text-muted">
                    [{question.marks} {question.marks === 1 ? "mark" : "marks"}]
                  </span>
                </div>
                {showHintWithQuestion && question.hint && (
                  <p className="mt-2 text-sm text-muted">Hint: {formatQuestion(question.hint)}</p>
                )}
              </li>
            ))}
          </ol>
        </section>
      )}

      <section className="mt-8">
        <h3 className="text-lg font-semibold">{isMemo ? "Memorandum" : "Answer memo"}</h3>
        <ol className="mt-4 space-y-4">
          {content.questions.map((question) => (
            <li key={question.number} className="border-b border-line pb-4 last:border-0">
              <p className="font-medium">
                <span className="font-mono text-brand">{question.number}.</span>{" "}
                {isMemo ? formatQuestion(question.questionText) : null}
              </p>
              <p className={isMemo ? "mt-1" : ""}>
                <span className="text-sm text-muted">Answer: </span>
                <span className="font-mono font-semibold">{formatQuestion(question.answerText)}</span>
              </p>
              {question.explanation.length > 0 && (
                <ol className="mt-2 list-inside list-decimal space-y-1 text-sm text-muted">
                  {question.explanation.map((step, stepIndex) => (
                    <li key={stepIndex}>{formatQuestion(step)}</li>
                  ))}
                </ol>
              )}
            </li>
          ))}
        </ol>
      </section>
    </div>
  );
}
