import type { BadgeTone } from "@/components/ui/Badge";

/**
 * Maps a percentage score to a supportive, non-judgemental performance band.
 * Shared by the diagnostic and practice result pages so the language is
 * consistent. The tone is deliberately encouraging — never "failed" or "bad".
 */
export type ResultBand = {
  label: string;
  tone: BadgeTone;
  message: string;
};

export function resultBand(percentage: number): ResultBand {
  if (percentage >= 80) {
    return {
      label: "Strong",
      tone: "success",
      message: "Excellent work — you have a solid grip on this. Stretch yourself with harder or mixed practice.",
    };
  }
  if (percentage >= 60) {
    return {
      label: "Developing well",
      tone: "brand",
      message: "Good progress. A little more focused practice will turn these into confident marks.",
    };
  }
  if (percentage >= 40) {
    return {
      label: "Needs focused practice",
      tone: "warning",
      message: "You're building the ideas. Work through the hints and worked steps, then try again.",
    };
  }
  return {
    label: "Needs support and revision",
    tone: "warning",
    message: "This is a great place to grow. Review the hints and worked solutions carefully, then retry — one step at a time.",
  };
}
