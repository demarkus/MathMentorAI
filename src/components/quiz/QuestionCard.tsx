import type { ReactNode } from "react";

/** Presentational question display. The answer input is passed as children. */
export function QuestionCard({
  difficulty,
  marks,
  topicName,
  questionText,
  children,
}: {
  difficulty: string;
  marks: number;
  topicName?: string;
  questionText: string;
  children?: ReactNode;
}) {
  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
        {topicName && (
          <span className="rounded-full border border-line bg-background px-3 py-1 text-xs font-medium text-muted">
            {topicName}
          </span>
        )}
        <span className="capitalize text-muted">
          {difficulty} · {marks} {marks === 1 ? "mark" : "marks"}
        </span>
      </div>
      <p className="mt-6 text-sm text-muted">Solve and enter your answer.</p>
      <h2 className="mt-2 font-mono text-3xl font-semibold md:text-4xl">{questionText}</h2>
      {children}
    </div>
  );
}
