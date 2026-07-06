"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { Alert } from "@/components/ui/Alert";
import { fieldClassName } from "@/components/ui/field";

export const QUESTION_GRADES = [9, 10] as const;
export const QUESTION_DIFFICULTIES = ["easy", "medium", "hard"] as const;
export type QuestionDifficulty = (typeof QUESTION_DIFFICULTIES)[number];
// CAPS cognitive levels (subset used for algebra items). Distinct from
// difficulty: "how hard" vs "what kind of thinking".
export const QUESTION_COGNITIVE_LEVELS = ["routine procedure", "complex procedure", "problem solving"] as const;
export type QuestionCognitiveLevel = (typeof QUESTION_COGNITIVE_LEVELS)[number];

/** The editable shape of a question, shared by the create and edit actions. */
export type QuestionInput = {
  topic_id: string;
  grade: number;
  question_text: string;
  answer_text: string;
  hint: string;
  solution_steps: string[];
  difficulty: QuestionDifficulty;
  cognitive_level: QuestionCognitiveLevel;
  marks: number;
  is_active: boolean;
};

export type QuestionActionResult = { error?: string };

export type FormTopic = { id: string; name: string; slug: string; grade: number };

const EMPTY: QuestionInput = {
  topic_id: "",
  grade: 9,
  question_text: "",
  answer_text: "",
  hint: "",
  solution_steps: [],
  difficulty: "medium",
  cognitive_level: "routine procedure",
  marks: 1,
  is_active: true,
};

export function QuestionForm({
  topics,
  initial,
  onSubmit,
  submitLabel,
  cancelHref = "/admin/questions",
}: {
  topics: FormTopic[];
  initial?: QuestionInput;
  onSubmit: (input: QuestionInput) => Promise<QuestionActionResult>;
  submitLabel: string;
  cancelHref?: string;
}) {
  const start = initial ?? EMPTY;
  const [topicId, setTopicId] = useState(start.topic_id || topics[0]?.id || "");
  const [grade, setGrade] = useState<number>(start.grade);
  const [questionText, setQuestionText] = useState(start.question_text);
  const [answerText, setAnswerText] = useState(start.answer_text);
  const [hint, setHint] = useState(start.hint);
  const [stepsText, setStepsText] = useState(start.solution_steps.join("\n"));
  const [difficulty, setDifficulty] = useState<QuestionDifficulty>(start.difficulty);
  const [cognitiveLevel, setCognitiveLevel] = useState<QuestionCognitiveLevel>(
    start.cognitive_level ?? "routine procedure",
  );
  const [marks, setMarks] = useState<number>(start.marks);
  const [isActive, setIsActive] = useState<boolean>(start.is_active);

  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const inputClass = fieldClassName;

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (isPending) return;
    setError(null);

    const solution_steps = stepsText
      .split("\n")
      .map((line) => line.trim())
      .filter((line) => line.length > 0);

    const input: QuestionInput = {
      topic_id: topicId,
      grade,
      question_text: questionText.trim(),
      answer_text: answerText.trim(),
      hint: hint.trim(),
      solution_steps,
      difficulty,
      cognitive_level: cognitiveLevel,
      marks,
      is_active: isActive,
    };

    startTransition(async () => {
      const result = await onSubmit(input);
      // On success the action redirects; only failures return here.
      if (result?.error) setError(result.error);
    });
  }

  return (
    <form onSubmit={handleSubmit} className="rounded-3xl border border-line bg-white p-6 md:p-8">
      <div className="grid gap-5 sm:grid-cols-2">
        <label className="block text-sm font-medium">
          Topic
          <select value={topicId} onChange={(event) => setTopicId(event.target.value)} className={inputClass}>
            {topics.length === 0 && <option value="">No topics available</option>}
            {topics.map((topic) => (
              <option key={topic.id} value={topic.id}>
                Grade {topic.grade} · {topic.name}
              </option>
            ))}
          </select>
        </label>

        <label className="block text-sm font-medium">
          Grade
          <select value={grade} onChange={(event) => setGrade(Number(event.target.value))} className={inputClass}>
            {QUESTION_GRADES.map((value) => (
              <option key={value} value={value}>
                Grade {value}
              </option>
            ))}
          </select>
        </label>

        <label className="block text-sm font-medium">
          Difficulty
          <select
            value={difficulty}
            onChange={(event) => setDifficulty(event.target.value as QuestionDifficulty)}
            className={inputClass}
          >
            {QUESTION_DIFFICULTIES.map((value) => (
              <option key={value} value={value}>
                {value[0].toUpperCase() + value.slice(1)}
              </option>
            ))}
          </select>
        </label>

        <label className="block text-sm font-medium">
          Cognitive level
          <select
            value={cognitiveLevel}
            onChange={(event) => setCognitiveLevel(event.target.value as QuestionCognitiveLevel)}
            className={inputClass}
          >
            {QUESTION_COGNITIVE_LEVELS.map((value) => (
              <option key={value} value={value}>
                {value[0].toUpperCase() + value.slice(1)}
              </option>
            ))}
          </select>
        </label>

        <label className="block text-sm font-medium">
          Marks
          <input
            type="number"
            min={1}
            value={marks}
            onChange={(event) => setMarks(Number(event.target.value))}
            className={inputClass}
          />
        </label>
      </div>

      <label className="mt-5 block text-sm font-medium">
        Question text
        <textarea
          value={questionText}
          onChange={(event) => setQuestionText(event.target.value)}
          rows={3}
          className={inputClass}
        />
      </label>

      <label className="mt-5 block text-sm font-medium">
        Answer
        <input type="text" value={answerText} onChange={(event) => setAnswerText(event.target.value)} className={inputClass} />
      </label>

      <label className="mt-5 block text-sm font-medium">
        Hint
        <input type="text" value={hint} onChange={(event) => setHint(event.target.value)} className={inputClass} />
      </label>

      <label className="mt-5 block text-sm font-medium">
        Solution steps <span className="text-muted">(one step per line)</span>
        <textarea
          value={stepsText}
          onChange={(event) => setStepsText(event.target.value)}
          rows={5}
          placeholder={"Take out the highest common factor.\nRewrite as a product."}
          className={inputClass}
        />
      </label>

      <label className="mt-5 flex items-center gap-3 text-sm font-medium">
        <input
          type="checkbox"
          checked={isActive}
          onChange={(event) => setIsActive(event.target.checked)}
          className="size-4 rounded border-line"
        />
        Active (visible to learners). Uncheck to deactivate instead of deleting.
      </label>

      {error && <Alert variant="error" className="mt-5">{error}</Alert>}

      <div className="mt-6 flex items-center gap-4">
        <button
          type="submit"
          disabled={isPending}
          className="rounded-xl bg-brand px-6 py-3 font-semibold text-white hover:bg-brand-dark disabled:opacity-50"
        >
          {isPending ? "Saving…" : submitLabel}
        </button>
        <Link href={cancelHref} className="text-sm font-semibold text-muted hover:text-brand">
          Cancel
        </Link>
      </div>
    </form>
  );
}
