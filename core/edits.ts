/**
 * Every edit the user can make to a Palette, as pure transformations. The
 * Palette is replaced rather than mutated, so React state and any future
 * undo stack both get a plain value to hold.
 */

import { prefixError } from "./prefix";
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

/**
 * Removes the Row occupying one Socket. Sockets below it move up and take the
 * numbers they now sit at, since a Socket's number is a property of position.
 */
export function removeRow(palette: Palette, index: number): Palette {
  if (!canRemoveRow(palette)) return palette;
  return { ...palette, rows: palette.rows.filter((_, at) => at !== index) };
}

/** Lightness is a percentage; anything outside the range is not a color. */
export const LIGHTNESS_MAX = 100;

/**
 * The authoring ceiling for Chroma, matching the Cross-section's radial axis.
 * Well outside the sRGB region on every Hue: colors past it are permitted and
 * fall back on export, so the ceiling is a bound on the control, not on the art.
 */
export const CHROMA_MAX = 0.5;

const FULL_TURN = 360;

/** The value held inside its range. Not the Fallback's chroma reduction. */
function within(value: number, max: number): number {
  return Math.min(Math.max(value, 0), max);
}

/** Hue is an angle, so it wraps: 370 degrees is 10 degrees, -30 is 330. */
function wrapHue(hue: number): number {
  return ((hue % FULL_TURN) + FULL_TURN) % FULL_TURN;
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

/** Sets the prefix, ignoring anything that would not name a custom property. */
export function setPrefix(palette: Palette, prefix: string): Palette {
  if (prefixError(prefix) !== null) return palette;
  return { ...palette, prefix };
}
