import type { ReactNode } from "react";

export type BadgeTone = "neutral" | "brand" | "accent" | "success" | "warning";

const TONES: Record<BadgeTone, string> = {
  neutral: "border border-line bg-background text-muted",
  brand: "bg-brand/10 text-brand-dark",
  accent: "bg-accent/15 text-brand-dark",
  success: "bg-green-100 text-green-900",
  warning: "bg-amber-100 text-amber-950",
};

/**
 * Small status pill. The tone is paired with clear text (never colour alone),
 * so the meaning survives for colour-blind and greyscale viewers.
 */
export function Badge({
  children,
  tone = "neutral",
  className = "",
}: {
  children: ReactNode;
  tone?: BadgeTone;
  className?: string;
}) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-medium ${TONES[tone]} ${className}`}
    >
      {children}
    </span>
  );
}
