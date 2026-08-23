"use client";

import { useDraft } from "./use-draft";

type NumberFieldProps = {
  /** Read out to assistive technology; the visible label is the column header. */
  label: string;
  value: number;
  onCommit: (value: number) => void;
  /** Omitted where the value wraps instead of being bounded, as Hue does. */
  min?: number;
  max?: number;
  suffix?: string;
};

/**
 * A number input over one Oklch component. Every parseable keystroke commits,
 * so the tiles and CSS follow the typing; the draft is dropped on blur, showing
 * whatever the core seam made of it.
 */
export function NumberField({
  label,
  value,
  onCommit,
  min,
  max,
  suffix,
}: NumberFieldProps) {
  const draft = useDraft(String(value));
  const bound = boundExceededBy(draft.text, min, max);

  function handleChange(typed: string) {
    draft.type(typed);
    const parsed = Number(typed);
    if (typed.trim() !== "" && Number.isFinite(parsed)) onCommit(parsed);
  }

  return (
    <span className="flex min-w-0 flex-col gap-0.5">
      <span className="flex items-center gap-1">
        <input
          type="number"
          inputMode="decimal"
          step="any"
          min={min}
          max={max}
          aria-label={label}
          value={draft.text}
          onChange={(event) => handleChange(event.target.value)}
          onBlur={draft.reset}
          className="w-full min-w-0 rounded-md border border-zinc-300 bg-transparent px-2 py-1.5 font-mono text-sm tabular-nums aria-invalid:border-amber-500 dark:border-zinc-700"
          aria-invalid={bound !== null}
        />
        {suffix ? (
          <span aria-hidden className="text-sm text-zinc-500">
            {suffix}
          </span>
        ) : null}
      </span>
      {/* Otherwise the field and the tiles would silently disagree: the Palette
          holds the bounded value while the field still shows what was typed. */}
      <span role="status" className="text-xs text-amber-600 dark:text-amber-500">
        {bound === null ? "" : `Held at ${bound}${suffix ?? ""}`}
      </span>
    </span>
  );
}

/** The bound the typed value overshot, or null while it is within range. */
function boundExceededBy(typed: string, min?: number, max?: number): number | null {
  const parsed = Number(typed);
  if (typed.trim() === "" || !Number.isFinite(parsed)) return null;
  if (min !== undefined && parsed < min) return min;
  if (max !== undefined && parsed > max) return max;
  return null;
}
