/**
 * The Lightness scale: every Row's Lightness on one track, and the two things
 * reading that track needs — where a marker sits, and what a drag to a point on
 * it means. The scale belongs to the whole Palette rather than to a Spectrum,
 * so nothing here knows about Chroma, Hue or Stops.
 */

import { LIGHTNESS_MAX } from "./color";
import { socketsOf, type Palette, type Socket } from "./palette";

/** One Row's Lightness as the scale draws it. */
export type LightnessMarker = {
  readonly socket: Socket;
  /** The Row's index, which is what an edit to its Lightness needs. */
  readonly index: number;
  /** As authored, at whatever precision it was typed at. */
  readonly lightness: number;
  /** Along the track: 0 at the black end, 1 at the white end. */
  readonly position: number;
};

/** Every Row's marker, in ladder order. */
export function markersOf(palette: Palette): LightnessMarker[] {
  return socketsOf(palette).map(({ socket, row }, index) => ({
    socket,
    index,
    lightness: row.lightness,
    position: row.lightness / LIGHTNESS_MAX,
  }));
}

/**
 * The step a drag lands on, per ADR-0002: it is the Lightness resolution the
 * gamut table is sampled at, so a dragged Lightness names a row of that table
 * exactly and the Cross-section needs no interpolation to follow the drag.
 *
 * Only the drag snaps: a typed Lightness keeps whatever precision it was given,
 * so a marker can hold a value no drag could have produced.
 */
export const LIGHTNESS_DRAG_STEP = 0.5;

/**
 * The Lightness a drag to this fraction of the track means. A pointer that runs
 * off either end comes to rest on that end, the same way a Row dragged past the
 * ladder does, so a drag that overshoots still means what it looks like it means.
 */
export function draggedLightness(fraction: number): number {
  const lightness = Math.min(Math.max(fraction, 0), 1) * LIGHTNESS_MAX;
  return Math.round(lightness / LIGHTNESS_DRAG_STEP) * LIGHTNESS_DRAG_STEP;
}

/**
 * Where a keyed nudge lands: one step along, brought onto the same grid the
 * drag snaps to, so the pointer and the arrow keys reach the same values. A
 * Lightness typed between two steps is taken to the nearer of the two the
 * nudge moves towards, rather than carrying its offset along the track.
 */
export function nudgedLightness(lightness: number, direction: number): number {
  const stepped = lightness + direction * LIGHTNESS_DRAG_STEP;
  return draggedLightness(stepped / LIGHTNESS_MAX);
}

/** Which way a step runs, or 0 where two Rows share a Lightness. */
function directionOf(from: number, to: number): number {
  return Math.sign(to - from);
}

/**
 * Whether the ladder turns back on itself: some step in it runs against the
 * direction the ladder started in. A ladder is monotonic while it only ever
 * darkens or only ever lightens; either direction is legal, so the first step
 * that goes anywhere sets which one this ladder is in, and Rows sharing a
 * Lightness are passed over rather than counted against it.
 *
 * Reported, never prevented: clamping a drag would stop it with no explanation
 * and re-sorting would rearrange the user's ladder mid-drag, so both override an
 * explicit action. The caller shows this; the Palette keeps it.
 *
 * One answer for the whole ladder rather than the offending pairs, because the
 * warning says only that the order has gone: which Rows they are is read off
 * the ladder and the scale, both of which are already on screen.
 */
export function ladderTurnsBack(palette: Palette): boolean {
  const rows = palette.rows;
  const steps = rows
    .slice(1)
    .map((row, at) => directionOf(rows[at].lightness, row.lightness))
    .filter((direction) => direction !== 0);
  return steps.some((direction) => direction !== steps[0]);
}
