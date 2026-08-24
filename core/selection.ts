/**
 * Which Row the user is working on. Exactly one Row is selected at a time, and
 * the selection outlives the focus that made it, so it is state of its own
 * rather than something read back off the document.
 */

import type { OklchColor } from "./color";
import { socketsOf, type Palette, type Socket, type Spectrum } from "./palette";

/** The selected Row, by its index in the ladder. */
export type Selection = number;

/** A Palette always has at least one Row, so the first one can always be selected. */
export const INITIAL_SELECTION: Selection = 0;

/** The selected Row's numbers: what the Cross-section slices at and reads out. */
export type Reading = {
  readonly socket: Socket;
  /** As authored. The Cross-section plots the authored Chroma, not a Fallback. */
  readonly color: OklchColor;
};

/**
 * The index the selection actually names. Removing a Row can leave the selection
 * past the end of the ladder, and exactly one Row is selected at all times, so
 * it comes to rest on the last one.
 */
export function selectedIndex(palette: Palette, selection: Selection): Selection {
  return Math.min(selection, palette.rows.length - 1);
}

/**
 * Where the selection goes when a Row is removed. It follows the Row the user
 * was working on rather than the index that Row happened to sit at, so removing
 * something above the selection does not quietly move it onto a different Row.
 *
 * Removing the selected Row itself leaves the index alone, which lands on the
 * Row that slides up into the Socket it vacated.
 */
export function selectionAfterRemoving(
  selection: Selection,
  removed: number,
): Selection {
  return removed < selection ? selection - 1 : selection;
}

/** What the selected Row reads as: its Socket, and the color it authors. */
export function readingAt(
  palette: Palette,
  spectrum: Spectrum,
  selection: Selection,
): Reading {
  const { socket, row } = socketsOf(palette)[selectedIndex(palette, selection)];
  const stop = row.stops[spectrum.id];
  return {
    socket,
    color: { lightness: row.lightness, chroma: stop.chroma, hue: stop.hue },
  };
}
