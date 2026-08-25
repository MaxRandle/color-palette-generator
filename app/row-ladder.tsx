"use client";

import { useRef, useState } from "react";
import { NumberField } from "./number-field";
import { CHROMA_MAX, LIGHTNESS_MAX } from "@/core/color";
import {
  addRow,
  canMoveRow,
  canRemoveRow,
  destinationIndex,
  moveRow,
  removeRow,
  setChroma,
  setHue,
  setLightness,
} from "@/core/edits";
import { socketsOf, type Palette, type Spectrum } from "@/core/palette";
import {
  selectionAfterMoving,
  selectionAfterRemoving,
  type Selection,
} from "@/core/selection";

type RowLadderProps = {
  palette: Palette;
  /** The Spectrum whose Stop each Row edits. v1 has exactly one. */
  spectrum: Spectrum;
  onChange: (palette: Palette) => void;
  /** The Row the Cross-section is following. */
  selected: Selection;
  onSelect: (selection: Selection) => void;
};

const REMOVE_CONTROL = "[data-removes-row]";
const MOVE_CONTROL = "[data-moves-row]";

function isInside(target: EventTarget | null, selector: string): boolean {
  return target instanceof Element && target.closest(selector) !== null;
}

/**
 * Whether focus landing inside a Row is the user choosing that Row. It is,
 * except from the remove control: that takes focus when clicked, and the Row it
 * would choose is the one it is about to remove. Focus is caught on the way down
 * rather than up, so `stopPropagation` on the click cannot answer this — the
 * selection would already have moved before the click was dispatched.
 */
function focusChoosesRow(target: EventTarget | null): boolean {
  return !isInside(target, REMOVE_CONTROL);
}

/**
 * The same question for a click, which additionally excludes the move control.
 * A drag ends in a click on the handle, and by then the handle names the Socket
 * the Row *left*: honouring it would drop the selection back where the Row was
 * dragged from. The handle picks its own Row on pointer down instead.
 */
function clickChoosesRow(target: EventTarget | null): boolean {
  return focusChoosesRow(target) && !isInside(target, MOVE_CONTROL);
}

/** Shared by the header and every Row, so the columns line up. */
const COLUMNS =
  "grid grid-cols-[2rem_3rem_repeat(3,minmax(0,1fr))_2rem] gap-2 px-2";

const HANDLE_HINT = "row-reorder-hint";

/**
 * The ladder of Rows, one per Socket: the Row's own Lightness plus the focused
 * Spectrum's Chroma and Hue. Adding, removing and reordering all renumber the
 * Sockets, because a Socket's number is a property of its position.
 *
 * A Row is dragged as a whole, per ADR-0001 — never a single Spectrum's Stop,
 * which is what would break the shared ladder. Reordering redefines what every
 * Socket number means, so the pointer drag and the keyboard moves are the same
 * operation reached two ways, and both narrate themselves to assistive
 * technology rather than leaving the new order to be seen.
 */
export function RowLadder({
  palette,
  spectrum,
  onChange,
  selected,
  onSelect,
}: RowLadderProps) {
  const removable = canRemoveRow(palette);
  const reorderable = canMoveRow(palette);
  const list = useRef<HTMLOListElement>(null);
  /** The index the dragged Row currently sits at, or null while none is held. */
  const [dragging, setDragging] = useState<number | null>(null);
  const [announcement, setAnnouncement] = useState("");

  /** The move control in one Socket's Row, which is where focus belongs after a move. */
  function moveControlAt(index: number): HTMLElement | null {
    const row = list.current?.children[index];
    return row?.querySelector<HTMLElement>(MOVE_CONTROL) ?? null;
  }

  /**
   * The one way a Row changes Socket, whether a pointer dragged it there or a
   * key sent it. The selection follows the Row rather than the index, so the
   * Cross-section keeps reading the Row the user was working on.
   */
  function move(from: number, to: number): number {
    const destination = destinationIndex(palette, to);
    if (destination === from) return from;
    const moved = moveRow(palette, from, destination);
    onChange(moved);
    onSelect(selectionAfterMoving(selected, from, destination));
    const ladder = socketsOf(moved);
    setAnnouncement(
      `Row moved to socket ${ladder[destination].socket.number}, ${destination + 1} of ${ladder.length}.`,
    );
    return destination;
  }

  /** The Socket the pointer is over, by index, from the Row boxes it crosses. */
  function socketUnder(clientY: number): number {
    const rows = Array.from(list.current?.children ?? []);
    const under = rows.findIndex(
      (row) => clientY < row.getBoundingClientRect().bottom,
    );
    return under === -1 ? rows.length - 1 : under;
  }

  return (
    <div className="flex flex-col gap-3">
      {/* Hidden from assistive technology: every input carries its own label. */}
      <div
        aria-hidden
        className={`${COLUMNS} text-xs font-medium tracking-wide text-zinc-600 uppercase dark:text-zinc-400`}
      >
        <span />
        <span>Shade</span>
        <span>Lightness</span>
        <span>Chroma</span>
        <span>Hue</span>
      </div>

      <p id={HANDLE_HINT} className="sr-only">
        Press arrow up or arrow down to move this row to another socket. The row
        carries its lightness with it and takes the destination socket&rsquo;s
        number.
      </p>

      <ol ref={list} className="flex flex-col gap-2">
        {socketsOf(palette).map(({ socket, row }, index) => {
          const stop = row.stops[spectrum.id];
          const at = `at socket ${socket.number}`;
          return (
            /* Two ways in, because selection is not focus: focus capture is
               what makes tabbing between fields move the selection, and the
               click covers the whole Row, including the Socket number and the
               gaps, without pulling focus anywhere. The selection deliberately
               outlives the focus that set it, so the Row carries a mark of its
               own instead of leaning on the focus ring. Both defer to a
               predicate that excludes the controls picking their own Row. */
            <li
              key={socket.number}
              aria-current={index === selected ? "true" : undefined}
              onFocusCapture={(event) => {
                if (focusChoosesRow(event.target)) onSelect(index);
              }}
              onClick={(event) => {
                if (clickChoosesRow(event.target)) onSelect(index);
              }}
              className={`${COLUMNS} items-center rounded-md py-1 ${
                index === selected
                  ? "bg-sky-50 ring-1 ring-sky-500 dark:bg-sky-950/40"
                  : ""
              } ${index === dragging ? "ring-2 ring-sky-500" : ""}`}
            >
              {/* A button rather than a bare draggable box, so the Row can be
                  reordered from the keyboard: reordering redefines every Socket
                  number, so a mouse-only control would undercut the very
                  accessibility guarantee the shared ladder exists for.
                  `touch-none` hands the vertical gesture to the drag instead of
                  letting the page scroll away underneath it. */}
              <button
                type="button"
                data-moves-row=""
                aria-disabled={!reorderable}
                aria-label={
                  reorderable
                    ? `Move row ${at}`
                    : `Move row ${at} — unavailable, the ladder has only one row`
                }
                aria-describedby={reorderable ? HANDLE_HINT : undefined}
                onPointerDown={(event) => {
                  if (!reorderable || event.button !== 0) return;
                  onSelect(index);
                  event.currentTarget.setPointerCapture(event.pointerId);
                  setDragging(index);
                }}
                onPointerMove={(event) => {
                  if (dragging === null) return;
                  setDragging(move(dragging, socketUnder(event.clientY)));
                }}
                /* Focus follows the Row out of the drag, the same as it does
                   out of a keyed move: the control the pointer pressed stays at
                   the Socket the Row left, so leaving focus there would aim the
                   next arrow key at whichever Row slid in behind it. */
                onPointerUp={() => {
                  if (dragging !== null) moveControlAt(dragging)?.focus();
                  setDragging(null);
                }}
                onPointerCancel={() => setDragging(null)}
                onKeyDown={(event) => {
                  if (!reorderable) return;
                  const step =
                    event.key === "ArrowUp"
                      ? -1
                      : event.key === "ArrowDown"
                        ? 1
                        : 0;
                  if (step === 0) return;
                  event.preventDefault();
                  // Rows are keyed by position, so the move control in the
                  // destination Row is already in the document: focus rides along.
                  moveControlAt(move(index, index + step))?.focus();
                }}
                className="touch-none cursor-grab rounded-md py-1.5 text-sm text-zinc-600 hover:bg-zinc-100 active:cursor-grabbing aria-disabled:cursor-not-allowed aria-disabled:opacity-40 aria-disabled:hover:bg-transparent dark:text-zinc-400 dark:hover:bg-zinc-800"
              >
                <span aria-hidden>⠿</span>
              </button>
              <span className="font-mono text-sm text-zinc-600 tabular-nums dark:text-zinc-400">
                {socket.number}
              </span>
              <NumberField
                label={`Lightness ${at}`}
                value={row.lightness}
                min={0}
                max={LIGHTNESS_MAX}
                suffix="%"
                onCommit={(lightness) =>
                  onChange(setLightness(palette, index, lightness))
                }
              />
              <NumberField
                label={`Chroma ${at}`}
                value={stop.chroma}
                min={0}
                max={CHROMA_MAX}
                onCommit={(chroma) =>
                  onChange(setChroma(palette, index, spectrum.id, chroma))
                }
              />
              {/* No min or max: Hue is an angle, so out-of-range input wraps. */}
              <NumberField
                label={`Hue ${at}`}
                value={stop.hue}
                suffix="°"
                onCommit={(hue) =>
                  onChange(setHue(palette, index, spectrum.id, hue))
                }
              />
              {/* aria-disabled rather than disabled: the button stays focusable,
                  so the reason the last Row cannot go is reachable by keyboard. */}
              <button
                type="button"
                aria-disabled={!removable}
                aria-label={
                  removable
                    ? `Remove row ${at}`
                    : `Remove row ${at} — unavailable, the last row cannot be removed`
                }
                data-removes-row=""
                onClick={() => {
                  if (removable) {
                    onSelect(selectionAfterRemoving(selected, index));
                  }
                  onChange(removeRow(palette, index));
                }}
                className="rounded-md border border-zinc-300 py-1.5 text-sm text-zinc-600 hover:bg-zinc-100 aria-disabled:cursor-not-allowed aria-disabled:opacity-40 aria-disabled:hover:bg-transparent dark:border-zinc-700 dark:text-zinc-400 dark:hover:bg-zinc-800"
              >
                <span aria-hidden>&times;</span>
              </button>
            </li>
          );
        })}
      </ol>

      {/* Reordering renumbers every Socket below the move, which is invisible to
          anyone not watching the ladder: the new Socket is spoken as it happens. */}
      <p role="status" aria-live="polite" className="sr-only">
        {announcement}
      </p>

      <div>
        <button
          type="button"
          onClick={() => onChange(addRow(palette))}
          className="rounded-md border border-zinc-300 px-3 py-1.5 text-sm font-medium text-zinc-700 hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
        >
          Add row
        </button>
      </div>
    </div>
  );
}
