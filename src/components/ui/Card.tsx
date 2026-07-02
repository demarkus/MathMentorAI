import type { ReactNode } from "react";

/**
 * The standard surface used across the app: a white, rounded, line-bordered
 * panel. Padding is left to the caller (pass via `className`) so it can serve
 * both dense list containers and roomy content cards.
 */
export function Card({
  as: Tag = "div",
  className = "",
  children,
}: {
  as?: "div" | "section" | "article";
  className?: string;
  children: ReactNode;
}) {
  return <Tag className={`rounded-2xl border border-line bg-white ${className}`}>{children}</Tag>;
}
