/**
 * Every edit the user can make to a Palette, as pure transformations. The
 * Palette is replaced rather than mutated, so React state and any future
 * undo stack both get a plain value to hold.
 */

import { CHROMA_MAX, FULL_TURN, LIGHTNESS_MAX } from "./color";
import { prefixError } from "./prefix";
import { mintSpectrum, spectrumNameError } from "./spectrum";
import type { Palette, Row, Stop } from "./palette";

/**
 * A new Row starts as a copy of the last one: a ramp is authored by nudging a
 * neighbour, never from zero. The copy is shared rather than cloned, which is
 * safe because every edit replaces a Row instead of mutating it.
 *
 * A Palette always has at least one Row — see `canRemoveRow`.
 */
export function addRow(palette: Palette): Palette {
  const last = palette.rows[palette.rows.length - 1];
  return { ...palette, rows: [...palette.rows, last] };
}

/** The ladder always has something to show, so the final Row cannot be removed. */
export function canRemoveRow(palette: Palette): boolean {
  return palette.rows.length > 1;
}

/** A lone Row has nowhere to go: there is no other Socket to move it into. */
export function canMoveRow(palette: Palette): boolean {
  return palette.rows.length > 1;
}

/**
 * Removes the Row occupying one Socket. Sockets below it move up and take the
 * numbers they now sit at, since a Socket's number is a property of position.
 */
export function removeRow(palette: Palette, index: number): Palette {
  if (!canRemoveRow(palette)) return palette;
  return { ...palette, rows: palette.rows.filter((_, at) => at !== index) };
}

/** The value held inside its range. Not the Fallback's chroma reduction. */
function within(value: number, max: number): number {
  return Math.min(Math.max(value, 0), max);
}

/** Hue is an angle, so it wraps: 370 degrees is 10 degrees, -30 is 330. */
function wrapHue(hue: number): number {
  return ((hue % FULL_TURN) + FULL_TURN) % FULL_TURN;
}

/**
 * The index a move actually reaches. A destination past either end of the ladder
 * comes to rest on the end Row, so a drag that runs off the ladder still means
 * what it looks like it means — and the caller can ask where a Row will land
 * without repeating the rule.
 */
export function destinationIndex(palette: Palette, to: number): number {
  return within(to, palette.rows.length - 1);
}

/**
 * Moves a Row into another Socket, per ADR-0001: the whole Row travels — its
 * Lightness together with every Spectrum's Stop — and takes the number of the
 * Socket it lands in. The Rows it passes shuffle to close the gap behind it, so
 * the ladder stays contiguous and a Socket keeps naming a position rather than
 * an occupant.
 */
export function moveRow(palette: Palette, from: number, to: number): Palette {
  const destination = destinationIndex(palette, to);
  if (!reaches(palette.rows, from, destination)) return palette;
  return { ...palette, rows: reordered(palette.rows, from, destination) };
}

/**
 * Whether a move is one the list can make: a real starting index, and somewhere
 * other than where the item already stands. Shared by the two reorders, so a
 * Spectrum dragged onto itself is as much a no-op as a Row is.
 */
function reaches(items: readonly unknown[], from: number, to: number): boolean {
  return from >= 0 && from < items.length && to !== from;
}

/** The list with one item lifted out and set down at another index. */
function reordered<T>(items: readonly T[], from: number, to: number): T[] {
  const next = [...items];
  const [moved] = next.splice(from, 1);
  next.splice(to, 0, moved);
  return next;
}

function replaceRow(palette: Palette, index: number, replace: (row: Row) => Row): Palette {
  return {
    ...palette,
    rows: palette.rows.map((row, at) => (at === index ? replace(row) : row)),
  };
}

function replaceStop(
  palette: Palette,
  index: number,
  spectrumId: string,
  replace: (stop: Stop) => Stop,
): Palette {
  return replaceRow(palette, index, (row) => ({
    ...row,
    stops: { ...row.stops, [spectrumId]: replace(row.stops[spectrumId]) },
  }));
}

/** Sets one Row's Lightness, the value it holds for every Spectrum. */
export function setLightness(palette: Palette, index: number, lightness: number): Palette {
  return replaceRow(palette, index, (row) => ({
    ...row,
    lightness: within(lightness, LIGHTNESS_MAX),
  }));
}

/** Sets one Spectrum's Chroma at one Row. */
export function setChroma(
  palette: Palette,
  index: number,
  spectrumId: string,
  chroma: number,
): Palette {
  return replaceStop(palette, index, spectrumId, (stop) => ({
    ...stop,
    chroma: within(chroma, CHROMA_MAX),
  }));
}

/** Sets one Spectrum's Hue at one Row, wrapped into a single turn. */
export function setHue(
  palette: Palette,
  index: number,
  spectrumId: string,
  hue: number,
): Palette {
  return replaceStop(palette, index, spectrumId, (stop) => ({
    ...stop,
    hue: wrapHue(hue),
  }));
}

/**
 * Adds a Spectrum, copying one already in the Palette Stop for Stop at every
 * Row. A ramp is authored by nudging a neighbour rather than from zero, the
 * same way a Row is, and the copy is what leaves the new Spectrum's name as the
 * only thing distinguishing it.
 *
 * The Stops are shared rather than cloned, which is safe because every edit
 * replaces a Stop instead of mutating it.
 */
export function addSpectrum(palette: Palette, copyOfId: string): Palette {
  const minted = mintSpectrum(palette.spectrums);
  return {
    ...palette,
    spectrums: [...palette.spectrums, minted],
    rows: palette.rows.map((row) => ({
      ...row,
      stops: { ...row.stops, [minted.id]: row.stops[copyOfId] },
    })),
  };
}

/**
 * Renames a Spectrum, ignoring anything that would not name a custom property
 * or that another Spectrum already holds. The id is untouched, so every Row's
 * Stops stay where they are and a Palette code already shared stays valid.
 */
export function renameSpectrum(
  palette: Palette,
  id: string,
  name: string,
): Palette {
  if (spectrumNameError(palette.spectrums, id, name) !== null) return palette;
  return {
    ...palette,
    spectrums: palette.spectrums.map((spectrum) =>
      spectrum.id === id ? { ...spectrum, name } : spectrum,
    ),
  };
}

/** A Palette is a Palette of colors, so the final Spectrum cannot be removed. */
export function canRemoveSpectrum(palette: Palette): boolean {
  return palette.spectrums.length > 1;
}

/**
 * Removes a Spectrum, and with it the Stop every Row held against it. Nothing
 * about the ladder changes: the Rows keep their Lightness and their Sockets
 * keep their numbers, since a Spectrum never contributed either.
 *
 * By position, as removing a Row is, and unlike the edits that reach for a
 * Stop: what goes is chosen from the tab strip, and the rule for where the
 * Active Spectrum lands afterwards is written in the same positions.
 */
export function removeSpectrum(palette: Palette, index: number): Palette {
  if (!canRemoveSpectrum(palette)) return palette;
  const removed = palette.spectrums[index];
  if (removed === undefined) return palette;
  return {
    ...palette,
    spectrums: palette.spectrums.filter((_, at) => at !== index),
    rows: palette.rows.map((row) => {
      const stops = { ...row.stops };
      delete stops[removed.id];
      return { ...row, stops };
    }),
  };
}

/** A lone Spectrum has nowhere to go: there is no other place in the strip. */
export function canMoveSpectrum(palette: Palette): boolean {
  return palette.spectrums.length > 1;
}

/**
 * The index a move along the tab strip actually reaches, the strip's answer to
 * `destinationIndex`: a drag that runs off either end comes to rest on the end
 * Spectrum, so it still means what it looks like it means.
 */
export function spectrumDestinationIndex(palette: Palette, to: number): number {
  return within(to, palette.spectrums.length - 1);
}

/**
 * Moves a Spectrum to another place in the strip. Order is presentation and
 * output — the tab strip, the Tile grid's columns, and the order the custom
 * properties are emitted in — so unlike moving a Row, which redefines what every
 * Socket number means, this touches nothing about the shared ladder.
 *
 * Not a single Row changes: a Stop is held against a Spectrum's id rather than
 * its place, so the Palette says the same colors in a different order.
 */
export function moveSpectrum(palette: Palette, from: number, to: number): Palette {
  const destination = spectrumDestinationIndex(palette, to);
  if (!reaches(palette.spectrums, from, destination)) return palette;
  return { ...palette, spectrums: reordered(palette.spectrums, from, destination) };
}

/** Sets the prefix, ignoring anything that would not name a custom property. */
export function setPrefix(palette: Palette, prefix: string): Palette {
  if (prefixError(prefix) !== null) return palette;
  return { ...palette, prefix };
}
