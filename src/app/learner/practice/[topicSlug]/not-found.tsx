import Link from "next/link";

export default function PracticeTopicNotFound() {
  return (
    <div className="space-y-6">
      <Link href="/learner/practice" className="inline-flex items-center gap-1 text-sm font-semibold text-brand hover:underline">
        <span aria-hidden>←</span> All practice topics
      </Link>
      <div className="rounded-2xl border border-line bg-white p-8 text-center">
        <h1 className="text-xl font-semibold">Topic not found</h1>
        <p className="mt-2 text-sm text-muted">We couldn’t find that practice topic. It may have been renamed or removed.</p>
        <Link href="/learner/practice" className="mt-6 inline-flex rounded-xl bg-brand px-5 py-3 font-semibold text-white hover:bg-brand-dark">
          Back to practice
        </Link>
      </div>
    </div>
  );
}
