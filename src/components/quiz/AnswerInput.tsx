"use client";

/** Controlled answer field. Pressing Enter triggers the parent's onEnter. */
export function AnswerInput({
  value,
  onChange,
  onEnter,
  disabled,
}: {
  value: string;
  onChange: (value: string) => void;
  onEnter?: () => void;
  disabled?: boolean;
}) {
  return (
    <label className="block text-sm font-medium">
      Your answer
      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === "Enter") {
            event.preventDefault();
            onEnter?.();
          }
        }}
        disabled={disabled}
        placeholder="Type your answer"
        autoComplete="off"
        inputMode="text"
        className="mt-2 w-full rounded-xl border border-line bg-background px-4 py-4 font-mono text-lg outline-none focus:border-brand disabled:opacity-60"
      />
    </label>
  );
}
