"use client";

import { useEffect, useRef, useState } from "react";
import { ChromaProfileField } from "./chroma-profile-field";
import { useDraft } from "./use-draft";
import {
  addSpectrum,
  canMoveSpectrum,
  canRemoveSpectrum,
  moveSpectrum,
  removeSpectrum,
  renameSpectrum,
  spectrumDestinationIndex,
} from "@/core/edits";
import {
  activeSpectrumAfterMoving,
  activeSpectrumAfterRemoving,
} from "@/core/selection";
import { spectrumNameError } from "@/core/spectrum";
import type { Palette } from "@/core/palette";

/** The tab naming one Spectrum, which is what labels the ladder editing it. */
export function spectrumTabId(spectrumId: string): string {
  return `spectrum-tab-${spectrumId}`;
}

const STRIP_LABEL = "spectrum-tabs-label";
const NAME_ERROR = "spectrum-name-error";
const REORDER_HINT = "spectrum-reorder-hint";

const CONTROL =
  "rounded-md border border-zinc-300 px-3 py-1.5 text-sm font-medium text-zinc-700 hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800";

type SpectrumTabsProps = {
  palette: Palette;
  onChange: (palette: Palette) => void;
  /** The Active Spectrum, by its index in the Palette. */
  active: number;
  onActivate: (spectrum: number) => void;
  /** The ladder these tabs switch, which is the panel they control. */
  panelId: string;
};

/**
 * The switcher for the Active Spectrum, per ADR-0003: the ladder shows one
 * Spectrum at a time, so which one is a choice the user makes here rather than
 * something read off the ladder.
 *
 * A real tablist, so the whole strip is one tab stop and the arrow keys walk it:
 * a Palette with six Spectrums would otherwise cost six tab stops to get past on
 * the way to the ladder. Switching is harmless and instant, so a tab activates
 * as it is reached rather than waiting to be pressed.
 *
 * The order of the strip is the order of the Tile grid's columns and of the
 * custom properties in the CSS, so it is worth arranging: a tab is dragged
 * along the strip to move its Spectrum, and Shift with an arrow key does the
 * same from the keyboard, the pointer and the keys being one operation reached
 * two ways as they are in the ladder. Unlike moving a Row this changes nothing
 * about the shared ladder — no Stop moves — so it is safe to do while reading.
 *
 * The tab is its own handle. A grip beside the name would be a second target
 * inside the tab, which is the thing this strip is arranged to avoid, and
 * pressing a tab to drag it already does what pressing it to switch does: the
 * Spectrum becomes Active either way, so there is no gesture to disambiguate.
 *
 * The name field and the remove button stand beside the strip rather than inside
 * each tab. Removing is unconfirmed, as removing a Row is, and an `x` on every
 * tab would put it under the pointer at the moment the user is only switching
 * Spectrums; both controls act on the Active one instead. The strip and the
 * field are here even with one Spectrum, so a name can be set before it starts
 * appearing in the CSS.
 */
export function SpectrumTabs({
  palette,
  onChange,
  active,
  onActivate,
  panelId,
}: SpectrumTabsProps) {
  const spectrums = palette.spectrums;
  const spectrum = spectrums[active];
  const removable = canRemoveSpectrum(palette);
  const draft = useDraft(spectrum.name);
  const error = spectrumNameError(spectrums, spectrum.id, draft.text);
  const reorderable = canMoveSpectrum(palette);
  const strip = useRef<HTMLDivElement>(null);
  const nameField = useRef<HTMLInputElement>(null);
  /** Set by `add`, so the field is taken over once it is showing the new name. */
  const naming = useRef(false);
  /** The place the dragged tab currently sits at, or null while none is held. */
  const [dragging, setDragging] = useState<number | null>(null);
  const [announcement, setAnnouncement] = useState("");

  // After the render, not during `add`: the field is one input shared by every
  // tab, so selecting its text before it has been retitled would select the
  // name of the Spectrum that was copied and then lose the selection to the
  // value change.
  useEffect(() => {
    if (!naming.current) return;
    naming.current = false;
    nameField.current?.focus();
    nameField.current?.select();
  });

  /**
   * Switching Spectrums drops whatever was half-typed in the name field: the
   * draft belongs to the Spectrum it was being typed for, and carrying it to
   * the next one would show one Spectrum's name under another's tab.
   */
  function activate(index: number): void {
    onActivate(index);
    draft.reset();
  }

  /** Roving tabindex: only the Active tab is in the tab order, so focus is moved by hand. */
  function focusTab(index: number): void {
    const tab = strip.current?.children[index];
    if (tab instanceof HTMLElement) tab.focus();
  }

  /**
   * The same, by Spectrum rather than by place. A move reorders the strip on the
   * next render, so until then the tab standing at an index is still the one
   * that was there before the move: after moving a Spectrum it is the Spectrum,
   * not the place, that the focus belongs to.
   */
  function focusSpectrumTab(id: string): void {
    document.getElementById(spectrumTabId(id))?.focus();
  }

  /**
   * The one way a Spectrum changes place, whether a pointer dragged it there or
   * a key sent it. The Active Spectrum follows the Spectrum rather than the
   * index, so the ladder keeps editing what the user was editing. The draft is
   * left alone: a move renames nothing, and the same Spectrum is still Active.
   */
  function move(from: number, to: number): number {
    const destination = spectrumDestinationIndex(palette, to);
    if (destination === from) return from;
    onChange(moveSpectrum(palette, from, destination));
    onActivate(activeSpectrumAfterMoving(active, from, destination));
    setAnnouncement(
      `Spectrum ${spectrums[from].name} moved to position ${destination + 1} of ${spectrums.length}.`,
    );
    return destination;
  }

  /**
   * The place the pointer is over, by the tab centre nearest it. The strip
   * wraps, so a tab can be below the pointer as easily as beside it and the
   * crossing has to be read in both directions at once.
   */
  function tabUnder(clientX: number, clientY: number): number {
    const tabs = Array.from(strip.current?.children ?? []);
    let nearest = 0;
    let shortest = Infinity;
    tabs.forEach((tab, index) => {
      const box = tab.getBoundingClientRect();
      const x = clientX - (box.left + box.width / 2);
      const y = clientY - (box.top + box.height / 2);
      const distance = x * x + y * y;
      if (distance < shortest) {
        shortest = distance;
        nearest = index;
      }
    });
    return nearest;
  }

  function handleKeyDown(event: React.KeyboardEvent, index: number): void {
    const last = spectrums.length - 1;
    // Shift takes the Spectrum along rather than leaving it behind: an arrow
    // alone walks the strip, and with Shift the tab travels under the focus.
    // The plain arrows are already spoken for here, and Shift is the one
    // modifier no browser or desktop has claimed for a button.
    if (event.shiftKey) {
      const step =
        event.key === "ArrowLeft" ? -1 : event.key === "ArrowRight" ? 1 : 0;
      if (step === 0 || !reorderable) return;
      event.preventDefault();
      const { id } = spectrums[index];
      move(index, index + step);
      // The Spectrum travelled, so the focus travels with it rather than staying
      // at the place it left, where the next Shift+arrow would move its
      // neighbour instead.
      focusSpectrumTab(id);
      return;
    }
    const next =
      event.key === "ArrowLeft"
        ? Math.max(index - 1, 0)
        : event.key === "ArrowRight"
          ? Math.min(index + 1, last)
          : event.key === "Home"
            ? 0
            : event.key === "End"
              ? last
              : index;
    if (next === index) return;
    event.preventDefault();
    activate(next);
    focusTab(next);
  }

  /**
   * The new Spectrum is a verbatim copy of the Active one, so its name is the
   * only thing telling the two apart and the only thing worth typing first: the
   * field takes focus with the minted name selected, ready to be typed over.
   */
  function add(): void {
    onChange(addSpectrum(palette, spectrum.id));
    activate(spectrums.length);
    naming.current = true;
  }

  function remove(index: number): void {
    if (!removable) return;
    onActivate(activeSpectrumAfterRemoving(active, index));
    onChange(removeSpectrum(palette, index));
    draft.reset();
  }

  /**
   * Invalid input stays in the field while the user is editing, so they can see
   * and fix what they typed, but never reaches the Palette: the core seam
   * refuses a name that is not a CSS identifier or that another Spectrum
   * already holds, and the field falls back to the last accepted name on blur.
   */
  function handleName(next: string): void {
    draft.type(next);
    onChange(renameSpectrum(palette, spectrum.id, next));
  }

  return (
    <div className="flex flex-wrap items-start gap-x-6 gap-y-4">
      <div className="flex flex-col gap-1.5">
        <span id={STRIP_LABEL} className="text-sm font-medium">
          Spectrums
        </span>
        <div className="flex flex-wrap items-center gap-1">
          <div
            ref={strip}
            role="tablist"
            aria-labelledby={STRIP_LABEL}
            className="flex flex-wrap items-center gap-1"
          >
            {spectrums.map((each, index) => (
              <button
                key={each.id}
                type="button"
                role="tab"
                id={spectrumTabId(each.id)}
                aria-selected={index === active}
                aria-controls={panelId}
                aria-describedby={reorderable ? REORDER_HINT : undefined}
                tabIndex={index === active ? 0 : -1}
                onClick={() => activate(index)}
                onKeyDown={(event) => handleKeyDown(event, index)}
                /* Pressing a tab to drag it and pressing it to switch are the
                   same press, so the Spectrum goes Active here rather than
                   waiting for the click that may never come. `touch-none` hands
                   the gesture to the drag instead of scrolling the page. */
                onPointerDown={(event) => {
                  if (!reorderable || event.button !== 0) return;
                  activate(index);
                  event.currentTarget.setPointerCapture(event.pointerId);
                  setDragging(index);
                }}
                onPointerMove={(event) => {
                  if (dragging === null) return;
                  setDragging(
                    move(dragging, tabUnder(event.clientX, event.clientY)),
                  );
                }}
                /* Focus follows the Spectrum out of the drag, as it does out of
                   a keyed move: the tab under the pointer at the end of a drag
                   is the dragged one, so the next arrow key aims from there. */
                onPointerUp={() => {
                  if (dragging !== null) focusSpectrumTab(each.id);
                  setDragging(null);
                }}
                onPointerCancel={() => setDragging(null)}
                className={`flex touch-none items-center gap-1.5 rounded-md border px-2.5 py-1.5 text-sm font-medium ${
                  reorderable ? "cursor-grab active:cursor-grabbing" : ""
                } ${
                  index === active
                    ? "border-sky-500 bg-sky-50 text-sky-900 dark:bg-sky-950/40 dark:text-sky-100"
                    : "border-zinc-300 text-zinc-700 hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
                } ${index === dragging ? "ring-2 ring-sky-500" : ""}`}
              >
                {/* The ladder's grip, so a tab looks like what it is: something
                    to be dragged. Decoration, not a control — the whole tab is
                    the handle, and the hint below is what says so to a screen
                    reader. It goes when there is one Spectrum, which has
                    nowhere to be dragged to. */}
                {reorderable && (
                  <span aria-hidden className="text-zinc-400 dark:text-zinc-500">
                    &#10303;
                  </span>
                )}
                {each.name}
              </button>
            ))}
          </div>
          {/* Outside the tablist, which owns nothing but tabs, and so its own
              tab stop: the strip's one stop is the whole point of the roving
              tabindex inside it. */}
          <button
            type="button"
            aria-label="Add spectrum"
            onClick={add}
            className={CONTROL}
          >
            <span aria-hidden>+</span>
          </button>
        </div>

        <p id={REORDER_HINT} className="sr-only">
          Press shift with arrow left or arrow right to move this spectrum along
          the strip. Its stops travel with it, and the tiles and the CSS follow
          the new order.
        </p>

        {/* The strip is the only place the order is visible, so a move made
            from the keyboard is spoken rather than left to be seen. */}
        <p role="status" aria-live="polite" className="sr-only">
          {announcement}
        </p>
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="spectrum-name" className="text-sm font-medium">
          Spectrum name
        </label>
        <div className="flex items-center gap-2">
          <input
            id="spectrum-name"
            ref={nameField}
            type="text"
            value={draft.text}
            onChange={(event) => handleName(event.target.value)}
            onBlur={draft.reset}
            aria-invalid={error !== null}
            aria-describedby={error ? NAME_ERROR : undefined}
            className="w-40 rounded-md border border-zinc-300 bg-transparent px-2 py-1.5 font-mono text-sm aria-invalid:border-red-500 dark:border-zinc-700"
          />
          {/* aria-disabled rather than disabled: the button stays focusable, so
              the reason the last Spectrum cannot go is reachable by keyboard. */}
          <button
            type="button"
            aria-disabled={!removable}
            aria-label={
              removable
                ? `Remove spectrum ${spectrum.name}`
                : `Remove spectrum ${spectrum.name} — unavailable, the last spectrum cannot be removed`
            }
            onClick={() => remove(active)}
            className="rounded-md border border-zinc-300 px-3 py-1.5 text-sm text-zinc-600 hover:bg-zinc-100 aria-disabled:cursor-not-allowed aria-disabled:opacity-40 aria-disabled:hover:bg-transparent dark:border-zinc-700 dark:text-zinc-400 dark:hover:bg-zinc-800"
          >
            <span aria-hidden>&times;</span>
          </button>
        </div>
        {/* Announced as it appears: the field is focused while the error changes. */}
        <p
          id={NAME_ERROR}
          role="alert"
          className="min-h-5 text-sm text-red-600 dark:text-red-400"
        >
          {error}
        </p>
      </div>

      <ChromaProfileField
        palette={palette}
        onChange={onChange}
        spectrum={spectrum}
      />
    </div>
  );
}
