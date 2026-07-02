import Link from "next/link";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/EmptyState";

export type AdminQuestionRow = {
  id: string;
  question_text: string;
  topicName: string;
  grade: number;
  difficulty: string;
  marks: number;
  is_active: boolean;
};

function preview(text: string): string {
  const clean = text.trim();
  return clean.length > 80 ? `${clean.slice(0, 80)}…` : clean;
}

export function QuestionTable({ questions }: { questions: AdminQuestionRow[] }) {
  if (questions.length === 0) {
    return <EmptyState title="No questions match" description="Adjust the filters, or add a new question." />;
  }

  return (
    <div className="overflow-x-auto rounded-2xl border border-line bg-white">
      <table className="w-full min-w-[820px] text-left text-sm">
        <thead className="border-b border-line text-xs uppercase tracking-wide text-muted">
          <tr>
            <th className="px-4 py-3 font-semibold">Question</th>
            <th className="px-4 py-3 font-semibold">Topic</th>
            <th className="px-4 py-3 font-semibold">Grade</th>
            <th className="px-4 py-3 font-semibold">Difficulty</th>
            <th className="px-4 py-3 font-semibold">Marks</th>
            <th className="px-4 py-3 font-semibold">Status</th>
            <th className="px-4 py-3 font-semibold text-right">Edit</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-line">
          {questions.map((question) => (
            <tr key={question.id} className="align-top">
              <td className="max-w-sm px-4 py-3 font-medium">{preview(question.question_text)}</td>
              <td className="px-4 py-3 text-muted">{question.topicName}</td>
              <td className="px-4 py-3">Grade {question.grade}</td>
              <td className="px-4 py-3 capitalize">{question.difficulty}</td>
              <td className="px-4 py-3">{question.marks}</td>
              <td className="px-4 py-3">
                <Badge tone={question.is_active ? "success" : "neutral"}>
                  {question.is_active ? "Active" : "Inactive"}
                </Badge>
              </td>
              <td className="px-4 py-3 text-right">
                <Link href={`/admin/questions/${question.id}/edit`} className="font-semibold text-brand hover:underline">
                  Edit
                </Link>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
