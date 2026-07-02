import type {
  ReactNode,
  InputHTMLAttributes,
  SelectHTMLAttributes,
  TextareaHTMLAttributes,
} from "react";

/**
 * The shared form-control styling used across every form in the app. Kept as a
 * single constant so inputs, selects, and textareas stay visually identical.
 */
export const fieldClassName =
  "mt-2 w-full rounded-xl border border-line bg-white px-4 py-3 text-sm outline-none focus:border-brand";

/** A labelled field wrapper. The visible label text also labels the control. */
export function Field({
  label,
  hint,
  children,
  className = "",
}: {
  label: ReactNode;
  hint?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <label className={`block text-sm font-medium ${className}`}>
      {label}
      {hint ? <span className="text-muted"> {hint}</span> : null}
      {children}
    </label>
  );
}

export function Input({ className = "", ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={`${fieldClassName} ${className}`} />;
}

export function Select({ className = "", ...props }: SelectHTMLAttributes<HTMLSelectElement>) {
  return <select {...props} className={`${fieldClassName} ${className}`} />;
}

export function Textarea({ className = "", ...props }: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea {...props} className={`${fieldClassName} ${className}`} />;
}
