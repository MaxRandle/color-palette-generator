/**
 * What the user is working on: one Row, and one Active Spectrum. A Row is
 * selected and a Spectrum is Active, and the two move independently — switching
 * tab keeps the Row, and picking a Row keeps the tab — so they are held as one
 * pair of indices rather than derived from one another.
 *
 * The selection outlives the focus that made it, so it is state of its own
 * rather than something read back off the document.
 */

import type { OklchColor } from "./color";
import { socketsOf, type Palette, type Socket, type Spectrum } from "./palette";

/** The selected Row and the Active Spectrum, each by its index. */
export type Selection = {
  readonly row: number;
  readonly spectrum: number;
};

/**
 * A Palette always has at least one Row and at least one Spectrum, so the first
 * of each can always be selected.
 */
export const INITIAL_SELECTION: Selection = { row: 0, spectrum: 0 };

/** The selected Row's numbers: what the Cross-section slices at and reads out. */
export type Reading = {
  readonly socket: Socket;
  /** As authored. The Cross-section plots the authored Chroma, not a Fallback. */
  readonly color: OklchColor;
};

/**
 * An index the Palette actually holds. Removing brings the ladder or the tab
 * strip up short of an index the selection still names, and exactly one of each
 * is chosen at all times, so a stale index comes to rest on the last element.
 *
 * The near end is held the same way, which is what lets a caller name the
 * neighbour of an index without first asking whether there is one: a step off
 * the edge of the Tile grid comes to rest on the edge rather than wrapping to
 * the far side of the Palette.
 */
function heldIndex(index: number, length: number): number {
  return Math.max(Math.min(index, length - 1), 0);
}

/**
 * The Row index the selection actually names. It clamps against the ladder
 * alone: a Spectrum coming or going never moves the selected Row.
 */
export function selectedRowIndex(palette: Palette, selection: Selection): number {
  return heldIndex(selection.row, palette.rows.length);
}

/** The Spectrum index the selection actually names, clamped against the tabs alone. */
export function activeSpectrumIndex(palette: Palette, selection: Selection): number {
  return heldIndex(selection.spectrum, palette.spectrums.length);
}

/**
 * The pair the Palette actually holds, each index clamped against its own axis.
 * The Tile grid moves in both at once, so it names the Tile it means — a Row
 * above, a Spectrum to the left — and lets the clamps decide whether that Tile
 * exists.
 */
export function heldSelection(palette: Palette, selection: Selection): Selection {
  return {
    row: selectedRowIndex(palette, selection),
    spectrum: activeSpectrumIndex(palette, selection),
  };
}

/** The one Spectrum the ladder is editing and the Cross-section is following. */
export function activeSpectrum(palette: Palette, selection: Selection): Spectrum {
  return palette.spectrums[activeSpectrumIndex(palette, selection)];
}

/**
 * Where the selection goes when a Row is removed. It follows the Row the user
 * was working on rather than the index that Row happened to sit at, so removing
 * something above the selection does not quietly move it onto a different Row.
 *
 * Removing the selected Row itself leaves the index alone, which lands on the
 * Row that slides up into the Socket it vacated.
 */
export function selectedRowAfterRemoving(
  selectedRow: number,
  removed: number,
): number {
  return removed < selectedRow ? selectedRow - 1 : selectedRow;
}

/**
 * The same rule for the tab strip: removing a Spectrum before the Active one
 * keeps that same Spectrum Active, and removing the Active one lands on
 * whichever Spectrum slides into its place.
 */
export function activeSpectrumAfterRemoving(
  active: number,
  removed: number,
): number {
  return selectedRowAfterRemoving(active, removed);
}

/** What the selected Row reads as: its Socket, and the color it authors. */
export function readingAt(palette: Palette, selection: Selection): Reading {
  const { socket, row } = socketsOf(palette)[selectedRowIndex(palette, selection)];
  const stop = row.stops[activeSpectrum(palette, selection).id];
  return {
    socket,
    color: { lightness: row.lightness, chroma: stop.chroma, hue: stop.hue },
  };
}

/**
 * Where the selection goes when a Row is moved. As with removal it follows the
 * Row the user was working on: the selected Row rides along to its destination,
 * and a Row moved past it shifts it by the one Socket the move displaced it by.
 */
export function selectedRowAfterMoving(
  selectedRow: number,
  from: number,
  to: number,
): number {
  if (selectedRow === from) return to;
  if (from < selectedRow && selectedRow <= to) return selectedRow - 1;
  if (to <= selectedRow && selectedRow < from) return selectedRow + 1;
  return selectedRow;
}

/**
 * The same rule again for a Spectrum moved along the tab strip: the Active
 * Spectrum rides along to its destination when it is the one dragged, and a
 * Spectrum dragged past it shifts it by the one place the move displaced it by.
 * Whichever Spectrum was being edited stays the one being edited.
 */
export function activeSpectrumAfterMoving(
  active: number,
  from: number,
  to: number,
): number {
  return selectedRowAfterMoving(active, from, to);
}
