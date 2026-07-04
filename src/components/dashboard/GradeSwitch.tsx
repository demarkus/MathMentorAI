import Link from "next/link";
import { VALID_GRADES } from "@/lib/learner/profile";

/**
 * An explicit, clearly-labelled grade selector for the learner catalogues. The
 * catalogue always shows ONE grade at a time (never a silent mix); this lets a
 * learner deliberately switch to the other grade. The active grade is highlighted
 * and marked with aria-current.
 */
export function GradeSwitch({ active, basePath }: { active: number; basePath: string }) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="text-sm text-muted">Showing</span>
      <div className="inline-flex rounded-xl border border-line bg-white p-1" role="group" aria-label="Choose grade">
        {VALID_GRADES.map((grade) => {
          const isActive = grade === active;
          return (
            <Link
              key={grade}
              href={`${basePath}?grade=${grade}`}
              aria-current={isActive ? "page" : undefined}
              className={`rounded-lg px-4 py-2 text-sm font-semibold transition ${
                isActive ? "bg-brand text-white" : "text-foreground hover:bg-line/40"
              }`}
            >
              Grade {grade}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
