import { TopicCard, type CatalogueTopic } from "./TopicCard";

/** A grade heading followed by a responsive grid of that grade's topic cards. */
export function GradeTopicSection({
  grade,
  topics,
  hrefBase,
  cta,
}: {
  grade: number;
  topics: CatalogueTopic[];
  hrefBase?: string;
  cta?: string;
}) {
  return (
    <section>
      <div className="flex items-baseline justify-between gap-3">
        <h2 className="text-xl font-semibold">Grade {grade}</h2>
        <span className="text-sm text-muted">{topics.length} topic{topics.length === 1 ? "" : "s"}</span>
      </div>
      <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {topics.map((topic) => (
          <TopicCard key={topic.id} topic={topic} hrefBase={hrefBase} cta={cta} />
        ))}
      </div>
    </section>
  );
}
