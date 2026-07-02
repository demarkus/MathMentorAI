"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { GeneratedResourceView } from "./GeneratedResourceView";
import { Alert } from "@/components/ui/Alert";
import { fieldClassName } from "@/components/ui/field";
import {
  RESOURCE_TYPES,
  DIFFICULTY_OPTIONS,
  GRADES,
  MIN_QUESTIONS,
  MAX_QUESTIONS,
  DEFAULT_QUESTIONS,
  type DifficultyOption,
  type ResourceType,
  type GeneratorRequest,
  type GenerateResult,
} from "@/lib/math/teacher-resources";

export type FormTopic = { id: string; name: string; slug: string; grade: number };

export function WorksheetGeneratorForm({
  topics,
  onGenerate,
}: {
  topics: FormTopic[];
  onGenerate: (request: GeneratorRequest) => Promise<GenerateResult>;
}) {
  const gradesWithTopics = GRADES.filter((grade) => topics.some((topic) => topic.grade === grade));
  const initialGrade = gradesWithTopics[0] ?? GRADES[0];

  const [grade, setGrade] = useState<number>(initialGrade);
  const [topicSlug, setTopicSlug] = useState<string>(
    topics.find((topic) => topic.grade === initialGrade)?.slug ?? "",
  );
  const [count, setCount] = useState<number>(DEFAULT_QUESTIONS);
  const [difficulty, setDifficulty] = useState<DifficultyOption>("mixed");
  const [resourceType, setResourceType] = useState<ResourceType>("worksheet");
  const [title, setTitle] = useState<string>("");

  const [result, setResult] = useState<GenerateResult | null>(null);
  const [isPending, startTransition] = useTransition();

  const topicsForGrade = topics.filter((topic) => topic.grade === grade);

  function onGradeChange(value: number) {
    setGrade(value);
    const firstTopic = topics.find((topic) => topic.grade === value);
    setTopicSlug(firstTopic?.slug ?? "");
  }

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (isPending || !topicSlug) return;
    startTransition(async () => {
      const response = await onGenerate({ grade, topicSlug, count, difficulty, resourceType, title });
      setResult(response);
    });
  }

  const inputClass = fieldClassName;

  return (
    <div className="space-y-8">
      <form onSubmit={handleSubmit} className="print:hidden rounded-3xl border border-line bg-white p-6 md:p-8">
        <div className="grid gap-5 sm:grid-cols-2">
          <label className="block text-sm font-medium">
            Grade
            <select value={grade} onChange={(event) => onGradeChange(Number(event.target.value))} className={inputClass}>
              {GRADES.map((value) => (
                <option key={value} value={value}>
                  Grade {value}
                </option>
              ))}
            </select>
          </label>

          <label className="block text-sm font-medium">
            Topic
            <select value={topicSlug} onChange={(event) => setTopicSlug(event.target.value)} className={inputClass}>
              {topicsForGrade.length === 0 && <option value="">No topics for this grade</option>}
              {topicsForGrade.map((topic) => (
                <option key={topic.id} value={topic.slug}>
                  {topic.name}
                </option>
              ))}
            </select>
          </label>

          <label className="block text-sm font-medium">
            Number of questions
            <input
              type="number"
              min={MIN_QUESTIONS}
              max={MAX_QUESTIONS}
              value={count}
              onChange={(event) => setCount(Number(event.target.value))}
              className={inputClass}
            />
          </label>

          <label className="block text-sm font-medium">
            Difficulty
            <select
              value={difficulty}
              onChange={(event) => setDifficulty(event.target.value as DifficultyOption)}
              className={inputClass}
            >
              {DIFFICULTY_OPTIONS.map((option) => (
                <option key={option} value={option}>
                  {option[0].toUpperCase() + option.slice(1)}
                </option>
              ))}
            </select>
          </label>

          <label className="block text-sm font-medium">
            Resource type
            <select
              value={resourceType}
              onChange={(event) => setResourceType(event.target.value as ResourceType)}
              className={inputClass}
            >
              {RESOURCE_TYPES.map((type) => (
                <option key={type.value} value={type.value}>
                  {type.label}
                </option>
              ))}
            </select>
          </label>

          <label className="block text-sm font-medium">
            Title <span className="text-muted">(optional)</span>
            <input
              type="text"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder="Auto-generated if left blank"
              className={inputClass}
            />
          </label>
        </div>

        <button
          type="submit"
          disabled={isPending || !topicSlug}
          className="mt-6 rounded-xl bg-brand px-6 py-3 font-semibold text-white hover:bg-brand-dark disabled:opacity-50"
        >
          {isPending ? "Generating…" : "Generate resource"}
        </button>

        {result?.error && <Alert variant="error" className="mt-5">{result.error}</Alert>}
      </form>

      {result?.content && (
        <div className="space-y-4">
          {result.resourceId ? (
            <Alert variant="success" className="print:hidden">
              Saved to your resources.{" "}
              <Link href={`/teacher/resources/${result.resourceId}`} className="font-semibold underline">
                Open the saved copy
              </Link>
              .
            </Alert>
          ) : (
            result.savedNote && (
              <Alert variant="warning" className="print:hidden">
                {result.savedNote}
              </Alert>
            )
          )}
          <GeneratedResourceView content={result.content} />
        </div>
      )}
    </div>
  );
}
