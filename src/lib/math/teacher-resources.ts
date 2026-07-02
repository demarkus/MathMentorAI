export const MIN_QUESTIONS = 1;
export const MAX_QUESTIONS = 30;
export const DEFAULT_QUESTIONS = 10;
export const GRADES = [9, 10] as const;

export const RESOURCE_TYPES = [
  { value: "worksheet", label: "Worksheet" },
  { value: "test", label: "Test" },
  { value: "memo", label: "Memo" },
  { value: "revision_pack", label: "Revision pack" },
] as const;
export type ResourceType = (typeof RESOURCE_TYPES)[number]["value"];

export const DIFFICULTY_OPTIONS = ["easy", "medium", "hard", "mixed"] as const;
export type DifficultyOption = (typeof DIFFICULTY_OPTIONS)[number];

export type SourceQuestion = {
  id: string;
  question_text: string;
  answer_text: string;
  hint: string;
  solution_steps: string[];
  difficulty: string;
  marks: number;
};

export type GeneratorRequest = {
  grade: number;
  topicSlug: string;
  count: number;
  difficulty: DifficultyOption;
  resourceType: ResourceType;
  title?: string;
};

export type WorksheetQuestion = {
  number: number;
  questionText: string;
  marks: number;
  difficulty: string;
  answerText: string;
  explanation: string[];
  hint: string;
};

export type WorksheetContent = {
  title: string;
  grade: number;
  topicName: string;
  topicSlug: string;
  resourceType: ResourceType;
  difficulty: DifficultyOption;
  requestedCount: number;
  generatedCount: number;
  totalMarks: number;
  note?: string;
  questions: WorksheetQuestion[];
};

export type GenerateResult = {
  content?: WorksheetContent;
  resourceId?: string;
  savedNote?: string;
  error?: string;
};

/** True when a Supabase error indicates the teacher_resources table is absent. */
export function isMissingTableError(
  error: { code?: string | null; message?: string | null } | null | undefined,
): boolean {
  if (!error) return false;
  if (error.code === "42P01" || error.code === "PGRST205") return true;
  return /does not exist|could not find the table/i.test(error.message ?? "");
}

export function isGrade(value: unknown): boolean {
  return GRADES.includes(Number(value) as (typeof GRADES)[number]);
}

export function isResourceType(value: unknown): value is ResourceType {
  return RESOURCE_TYPES.some((type) => type.value === value);
}

export function isDifficultyOption(value: unknown): value is DifficultyOption {
  return DIFFICULTY_OPTIONS.includes(value as DifficultyOption);
}

export function clampQuestionCount(value: number): number {
  const rounded = Math.round(Number.isFinite(value) ? value : DEFAULT_QUESTIONS);
  return Math.min(MAX_QUESTIONS, Math.max(MIN_QUESTIONS, rounded || DEFAULT_QUESTIONS));
}

export function resourceTypeLabel(type: ResourceType): string {
  return RESOURCE_TYPES.find((entry) => entry.value === type)?.label ?? "Worksheet";
}

/** The worked explanation for a question: solution steps, or the hint as fallback. */
export function explanationFrom(question: { solution_steps?: string[]; hint?: string }): string[] {
  if (question.solution_steps && question.solution_steps.length > 0) return question.solution_steps;
  return question.hint ? [question.hint] : [];
}

/**
 * Selects up to `count` questions. For a specific difficulty it filters to it;
 * for "mixed" it round-robins easy → medium → hard for variety.
 */
export function selectQuestions(
  all: SourceQuestion[],
  count: number,
  difficulty: DifficultyOption,
): SourceQuestion[] {
  if (difficulty !== "mixed") {
    return all.filter((question) => question.difficulty === difficulty).slice(0, count);
  }
  const buckets = ["easy", "medium", "hard"].map((level) => all.filter((q) => q.difficulty === level));
  const ordered: SourceQuestion[] = [];
  let added = true;
  while (added && ordered.length < count) {
    added = false;
    for (const bucket of buckets) {
      const next = bucket.shift();
      if (next) {
        ordered.push(next);
        added = true;
        if (ordered.length >= count) break;
      }
    }
  }
  return ordered.slice(0, count);
}

export function defaultTitle(grade: number, topicName: string, type: ResourceType): string {
  return `${resourceTypeLabel(type)} · Grade ${grade} ${topicName}`;
}

export function buildWorksheetContent(
  request: GeneratorRequest,
  topic: { name: string; slug: string; grade: number },
  selected: SourceQuestion[],
): WorksheetContent {
  const questions: WorksheetQuestion[] = selected.map((question, index) => ({
    number: index + 1,
    questionText: question.question_text,
    marks: question.marks,
    difficulty: question.difficulty,
    answerText: question.answer_text,
    explanation: explanationFrom(question),
    hint: question.hint,
  }));
  const totalMarks = questions.reduce((sum, question) => sum + question.marks, 0);
  const note =
    questions.length < request.count
      ? `Only ${questions.length} matching question${questions.length === 1 ? "" : "s"} were available (you requested ${request.count}).`
      : undefined;

  return {
    title: request.title?.trim() || defaultTitle(topic.grade, topic.name, request.resourceType),
    grade: topic.grade,
    topicName: topic.name,
    topicSlug: topic.slug,
    resourceType: request.resourceType,
    difficulty: request.difficulty,
    requestedCount: request.count,
    generatedCount: questions.length,
    totalMarks,
    note,
    questions,
  };
}

/** Guard for content read back from teacher_resources.content (jsonb). */
export function isWorksheetContent(value: unknown): value is WorksheetContent {
  if (!value || typeof value !== "object") return false;
  const candidate = value as Record<string, unknown>;
  return (
    typeof candidate.title === "string" &&
    typeof candidate.grade === "number" &&
    Array.isArray(candidate.questions)
  );
}
