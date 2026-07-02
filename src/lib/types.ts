export type Role = "student" | "parent" | "teacher" | "admin";

export type Topic = {
  id: string;
  grade: 9 | 10;
  name: string;
  slug: string;
  description: string;
};

export type Question = {
  id: string;
  topic_id: string;
  grade: 9 | 10;
  question_text: string;
  answer_text: string;
  hint: string;
  solution_steps: string[];
  difficulty: "easy" | "medium" | "hard";
  marks: number;
};
