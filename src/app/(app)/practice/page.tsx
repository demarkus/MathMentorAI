import { redirect } from "next/navigation";

export default async function PracticePage({ searchParams }: { searchParams: Promise<{ topic?: string; grade?: string }> }) {
  const params = await searchParams;
  const query = new URLSearchParams();
  if (params.topic) query.set("topic", params.topic);
  if (params.grade) query.set("grade", params.grade);
  const suffix = query.toString();
  redirect(suffix ? `/learner/practice?${suffix}` : "/learner/practice");
}
