import Link from "next/link";
import { EmptyState } from "@/components/ui/EmptyState";

export default function TopicNotFound() {
  return (
    <div className="space-y-6">
      <Link href="/learner/topics" className="inline-flex items-center gap-1 text-sm font-semibold text-brand hover:underline">
        <span aria-hidden>←</span> All topics
      </Link>
      <EmptyState
        headingLevel="h1"
        title="Topic not found"
        description="We couldn’t find that topic. It may have been renamed or removed."
        action={
          <Link href="/learner/topics" className="inline-flex rounded-xl bg-brand px-5 py-3 font-semibold text-white hover:bg-brand-dark">
            Back to catalogue
          </Link>
        }
      />
    </div>
  );
}
