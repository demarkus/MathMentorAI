import type { ReactNode } from "react";

export type AlertVariant = "error" | "success" | "warning" | "info";

const STYLES: Record<AlertVariant, { box: string; icon: string; label: string }> = {
  error: { box: "bg-red-50 text-red-800", icon: "⚠", label: "Error" },
  success: { box: "bg-green-50 text-green-900", icon: "✓", label: "Success" },
  warning: { box: "bg-amber-50 text-amber-950", icon: "!", label: "Notice" },
  info: { box: "bg-brand/5 text-foreground", icon: "ℹ", label: "Information" },
};

/**
 * Inline message block for form and fetch feedback. Errors and warnings use
 * role="alert" so assistive tech announces them; every variant carries an icon
 * plus a screen-reader label, so meaning is never conveyed by colour alone.
 */
export function Alert({
  variant = "info",
  children,
  className = "",
}: {
  variant?: AlertVariant;
  children: ReactNode;
  className?: string;
}) {
  const style = STYLES[variant];
  const assertive = variant === "error" || variant === "warning";
  return (
    <div
      role={assertive ? "alert" : "status"}
      className={`flex gap-2.5 rounded-xl p-3.5 text-sm ${style.box} ${className}`}
    >
      <span aria-hidden className="mt-px font-semibold">
        {style.icon}
      </span>
      <div>
        <span className="sr-only">{style.label}: </span>
        {children}
      </div>
    </div>
  );
}
