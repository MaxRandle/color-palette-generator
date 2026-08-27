"use client";

import { useEffect, useRef } from "react";
import { useDraft } from "./use-draft";

type NumberFieldProps = {
  /** Read out to assistive technology; the visible label is the column header. */
  label: string;
  value: number;
  onCommit: (value: number) => void;
  /** Omitted where the value wraps instead of being bounded, as Hue does. */
  min?: number;
  max?: number;
  /**
   * What one press of an arrow key moves the value by. Left open by default:
   * a component with no grid of its own should not invent one.
   */
  step?: number;
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
  step,
  suffix,
}: NumberFieldProps) {
  const draft = useDraft(String(value));
  const bound = boundExceededBy(draft.text, min, max);
  const input = useRef<HTMLInputElement>(null);
  useSilentWheel(input);

  function handleChange(typed: string) {
    draft.type(typed);
    const parsed = Number(typed);
    if (typed.trim() !== "" && Number.isFinite(parsed)) onCommit(parsed);
  }

  return (
    <span className="flex min-w-0 flex-col gap-0.5">
      <span className="flex items-center gap-1">
        <input
          ref={input}
          type="number"
          inputMode="decimal"
          // A step bounds the arrow keys, not the keyboard: a value typed
          // between two steps is still accepted and still committed, and the
          // next arrow press brings it onto the grid. The browser marks such a
          // value `stepMismatch`, which is inert here — the field decides its
          // own `aria-invalid`, styles off that, and is in no form to submit.
          step={step ?? "any"}
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
          <span
            aria-hidden
            className="text-sm text-zinc-600 dark:text-zinc-400"
          >
            {suffix}
          </span>
        ) : null}
      </span>
      {/* Otherwise the field and the tiles would silently disagree: the Palette
          holds the bounded value while the field still shows what was typed. */}
      <span
        role="status"
        className="text-xs text-amber-600 dark:text-amber-500"
      >
        {bound === null ? "" : `Held at ${bound}${suffix ?? ""}`}
      </span>
    </span>
  );
}

/**
 * Stops a wheel over this field from spinning its value, while leaving the
 * gesture meaning what it always meant: scroll the page.
 *
 * The ladder is a column of number inputs tall enough to need scrolling, so a
 * wheel that edits the field under the pointer would rewrite the Palette while
 * the user was only trying to read the rest of it — and every keystroke here
 * commits, so that edit lands in the URL and the CSS immediately.
 *
 * It has to be wired by hand rather than through `onWheel`, because React
 * registers `wheel` passively on the root container: `preventDefault` from a
 * React handler is ignored. Cancelling also takes the scroll with it — the spin
 * and the scroll are one default action — so the scroll is reissued here. The
 * page is the only scroller (the ladder sets its height rather than scrolling
 * in a box), so the window is the right thing to move.
 */
function useSilentWheel(input: React.RefObject<HTMLInputElement | null>): void {
  useEffect(() => {
    const field = input.current;
    if (field === null) return;
    function spinning(event: WheelEvent): void {
      // Unfocused, the wheel does not reach the value at all, so there is
      // nothing to cancel and the browser can scroll on its own terms.
      if (document.activeElement !== field) return;
      event.preventDefault();
      window.scrollBy(0, pixelsOf(event));
    }
    field.addEventListener("wheel", spinning, { passive: false });
    return () => field.removeEventListener("wheel", spinning);
  }, [input]);
}

/** One line, for the browsers that report a wheel in lines rather than pixels. */
const LINE_HEIGHT = 16;

/** How far a wheel event asked to scroll, whichever unit it was reported in. */
function pixelsOf(event: WheelEvent): number {
  if (event.deltaMode === WheelEvent.DOM_DELTA_LINE) {
    return event.deltaY * LINE_HEIGHT;
  }
  if (event.deltaMode === WheelEvent.DOM_DELTA_PAGE) {
    return event.deltaY * window.innerHeight;
  }
  return event.deltaY;
}

/** The bound the typed value overshot, or null while it is within range. */
function boundExceededBy(
  typed: string,
  min?: number,
  max?: number,
): number | null {
  const parsed = Number(typed);
  if (typed.trim() === "" || !Number.isFinite(parsed)) return null;
  if (min !== undefined && parsed < min) return min;
  if (max !== undefined && parsed > max) return max;
  return null;
}
