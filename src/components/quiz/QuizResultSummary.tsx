import Link from "next/link";
import { buildRecommendation, weakestTopic, type DiagnosticSummary } from "@/lib/math/diagnostic";
import { resultBand } from "@/lib/math/result-band";
import { Badge } from "@/components/ui/Badge";

/** Presentational diagnostic result: score, strengths, gaps, recommendations. */
export function QuizResultSummary({ summary }: { summary: DiagnosticSummary }) {
  const { score, totalMarks, correct, totalQuestions, percentage, weakTopics, strongTopics, topics } = summary;
  const band = resultBand(percentage);
  const weakest = weakestTopic(summary);

  return (
    <div className="space-y-8">
      <div className="rounded-3xl border border-line bg-white p-8 text-center">
        <p className="text-sm font-semibold text-brand">Diagnostic complete</p>
        <p className="mt-4 font-mono text-6xl font-semibold">{percentage}%</p>
        <div className="mt-4 flex justify-center">
          <Badge tone={band.tone}>{band.label}</Badge>
        </div>
        <p className="mt-3 text-muted">
          You scored {score} of {totalMarks} marks · {correct} of {totalQuestions} questions correct.
        </p>
        <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-muted">{band.message}</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="rounded-2xl border border-line bg-white p-6">
          <h3 className="text-lg font-semibold">Strengths</h3>
          {strongTopics.length > 0 ? (
            <ul className="mt-3 space-y-1 text-sm text-muted">
              {strongTopics.map((topic) => (
                <li key={topic}>✓ {topic}</li>
              ))}
            </ul>
          ) : (
            <p className="mt-3 text-sm text-muted">Keep practising to build clear strengths.</p>
          )}
        </div>
        <div className="rounded-2xl border border-line bg-white p-6">
          <h3 className="text-lg font-semibold">Focus areas</h3>
          {weakTopics.length > 0 ? (
            <ul className="mt-3 space-y-1 text-sm text-muted">
              {weakTopics.map((topic) => (
                <li key={topic}>• {topic}</li>
              ))}
            </ul>
          ) : (
            <p className="mt-3 text-sm text-muted">No major gaps — nice work!</p>
          )}
        </div>
      </div>

      {topics.length > 0 && (
        <div className="rounded-2xl border border-line bg-white p-6">
          <h3 className="text-lg font-semibold">Topic breakdown</h3>
          <div className="mt-4 space-y-3">
            {topics.map((topic) => (
              <div key={`${topic.slug}-${topic.topic}`}>
                <div className="flex items-center justify-between text-sm">
                  <span>{topic.topic}</span>
                  <span className="font-mono text-muted">
                    {topic.correct}/{topic.total}
                  </span>
                </div>
                <div className="mt-1 h-1.5 rounded-full bg-line">
                  <div className="h-1.5 rounded-full bg-brand" style={{ width: `${topic.percentage}%` }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="rounded-2xl border border-line bg-white p-6">
        <h3 className="text-lg font-semibold">Your next step</h3>
        <p className="mt-3 text-sm leading-6 text-muted">{buildRecommendation(summary)}</p>
        <div className="mt-5 flex flex-wrap gap-3">
          {weakest && weakest.slug ? (
            <Link
              href={`/learner/practice/${weakest.slug}`}
              className="rounded-xl bg-brand px-5 py-3 font-semibold text-white hover:bg-brand-dark"
            >
              Practise {weakest.topic}
            </Link>
          ) : (
            <Link href="/learner/practice" className="rounded-xl bg-brand px-5 py-3 font-semibold text-white hover:bg-brand-dark">
              Start practice
            </Link>
          )}
          <Link href="/learner/topics" className="rounded-xl border border-line px-5 py-3 font-semibold hover:border-brand/40">
            Browse topics
          </Link>
          <Link href="/learner/progress" className="rounded-xl border border-line px-5 py-3 font-semibold hover:border-brand/40">
            View progress
          </Link>
          <Link href="/learner/diagnostic" className="rounded-xl border border-line px-5 py-3 font-semibold hover:border-brand/40">
            Retake diagnostic
          </Link>
        </div>
      </div>
    </div>
  );
}
