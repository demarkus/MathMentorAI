/**
 * Safe, presentational rendering of worked solutions and hints.
 *
 * Steps are stored as a JSON array of strings (`solution_steps`). We render each
 * as an ordered-list item. If a single step contains line breaks (plain-text
 * style), we split it into readable paragraphs. Nothing is ever rendered with
 * dangerouslySetInnerHTML — all content is treated as plain text.
 */

/** Worked steps, or a clear fallback when none are available. */
export function WorkedSteps({ steps, className = "" }: { steps: string[]; className?: string }) {
  const cleaned = steps.map((step) => step.trim()).filter((step) => step.length > 0);

  if (cleaned.length === 0) {
    return <p className={`text-sm text-muted ${className}`}>Worked solution not available yet.</p>;
  }

  // A single multi-line step is treated as prose; otherwise as ordered steps.
  if (cleaned.length === 1 && cleaned[0].includes("\n")) {
    const paragraphs = cleaned[0].split(/\n+/).map((line) => line.trim()).filter(Boolean);
    return (
      <div className={`space-y-2 text-sm leading-6 ${className}`}>
        {paragraphs.map((paragraph, index) => (
          <p key={index}>{paragraph}</p>
        ))}
      </div>
    );
  }

  return (
    <ol className={`list-inside list-decimal space-y-1 text-sm leading-6 ${className}`}>
      {cleaned.map((step, index) => (
        <li key={index}>{step}</li>
      ))}
    </ol>
  );
}

/** A distinct hint callout, shown separately from the worked steps. */
export function HintBox({ hint, className = "" }: { hint: string; className?: string }) {
  if (!hint || hint.trim().length === 0) return null;
  return (
    <div className={`rounded-xl border border-line bg-accent/10 p-3 text-sm ${className}`}>
      <span className="font-semibold">Hint: </span>
      {hint.trim()}
    </div>
  );
}
