import Link from "next/link";

export type CatalogueTopic = {
  id: string;
  grade: number;
  name: string;
  slug: string;
  description: string;
  display_order: number;
};

/**
 * Topic card linking to a topic-scoped route (detail by default, or practice
 * when `hrefBase` is overridden). The grade is carried in the query string
 * because slugs are only unique per grade (e.g. "factorisation" exists in both
 * Grade 9 and Grade 10).
 */
export function TopicCard({
  topic,
  hrefBase = "/learner/topics",
  cta = "View topic",
}: {
  topic: CatalogueTopic;
  hrefBase?: string;
  cta?: string;
}) {
  return (
    <Link
      href={`${hrefBase}/${topic.slug}?grade=${topic.grade}`}
      className="group flex h-full flex-col rounded-2xl border border-line bg-white p-5 hover:-translate-y-0.5 hover:border-brand/40"
    >
      <div className="flex items-start justify-between gap-3">
        <span className="grid size-8 place-items-center rounded-lg bg-brand/10 font-mono text-sm font-semibold text-brand">
          {topic.display_order}
        </span>
        <span className="rounded-full border border-line bg-background px-3 py-1 text-xs font-medium text-muted">
          Grade {topic.grade}
        </span>
      </div>
      <h3 className="mt-4 text-lg font-semibold">{topic.name}</h3>
      <p className="mt-2 text-sm leading-6 text-muted">{topic.description}</p>
      <span className="mt-auto inline-flex items-center gap-1 pt-4 text-sm font-semibold text-brand group-hover:gap-2">
        {cta} <span aria-hidden>→</span>
      </span>
    </Link>
  );
}
