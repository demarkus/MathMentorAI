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
        placeholder="e.g. x = 5, (x+2)(x+3), 2x+1"
        aria-describedby="answer-help"
        autoComplete="off"
        autoCorrect="off"
        autoCapitalize="off"
        spellCheck={false}
        inputMode="text"
        className="mt-2 w-full rounded-xl border border-line bg-background px-4 py-4 font-mono text-lg outline-none focus:border-brand disabled:opacity-60"
      />
      <span id="answer-help" className="mt-2 block text-xs font-normal text-muted">
        Type your final answer. Use brackets where needed. Press Enter to continue.
      </span>
    </label>
  );
}
