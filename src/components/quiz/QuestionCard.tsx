import type { ReactNode } from "react";
import { Badge } from "@/components/ui/Badge";
import type { BadgeTone } from "@/components/ui/Badge";
import { formatQuestion } from "@/lib/math/format-question";

const DIFFICULTY_TONE: Record<string, BadgeTone> = {
  easy: "success",
  medium: "brand",
  hard: "warning",
};

/** Presentational question display. The answer input is passed as children. */
export function QuestionCard({
  difficulty,
  marks,
  topicName,
  grade,
  questionText,
  expectedAnswerNote,
  children,
}: {
  difficulty: string;
  marks: number;
  topicName?: string;
  grade?: number;
  questionText: string;
  expectedAnswerNote?: string | null;
  children?: ReactNode;
}) {
  return (
    <div>
      <div className="flex flex-wrap items-center gap-2">
        {topicName && <Badge tone="neutral">{topicName}</Badge>}
        {typeof grade === "number" && grade > 0 && <Badge tone="neutral">Grade {grade}</Badge>}
        <Badge tone={DIFFICULTY_TONE[difficulty.toLowerCase()] ?? "neutral"} className="capitalize">
          {difficulty}
        </Badge>
        <Badge tone="neutral">
          {marks} {marks === 1 ? "mark" : "marks"}
        </Badge>
      </div>
      <p className="mt-6 text-sm text-muted">Solve and enter your answer.</p>
      <h2 className="mt-2 break-words font-mono text-3xl font-semibold leading-snug md:text-4xl">
        {formatQuestion(questionText)}
      </h2>
      {expectedAnswerNote && <p className="mt-3 text-sm text-muted">{expectedAnswerNote}</p>}
      {children}
    </div>
  );
}
