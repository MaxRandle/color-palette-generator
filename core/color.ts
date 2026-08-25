import { converter, formatHex, type Oklch } from "culori";
import type { Row, Spectrum } from "./palette";

/**
 * A color in the authoring space. Lightness is a percentage (0–100), Chroma is
 * unitless (0–0.5), Hue is degrees (0–360).
 */
export type OklchColor = {
  readonly lightness: number;
  readonly chroma: number;
  readonly hue: number;
};

/** Lightness is a percentage; anything outside the range is not a color. */
export const LIGHTNESS_MAX = 100;

/**
 * The authoring ceiling for Chroma, matching the Cross-section's radial axis.
 * Well outside the sRGB region on every Hue: colors past it are permitted and
 * fall back on export, so the ceiling is a bound on the control, not on the art.
 */
export const CHROMA_MAX = 0.5;

/**
 * The step Chroma moves in when it is nudged rather than typed: a hundredth of
 * the authoring range. Unlike the Lightness step it answers to nothing in the
 * gamut table — Chroma is what that table holds, not an axis it is sampled
 * along — so it is chosen for the hand: coarse enough that an arrow key is
 * worth pressing, and still a couple of times the ~0.002 that moves a hex
 * channel, so every press is a change someone can see.
 */
export const CHROMA_STEP = 0.005;

/** Hue is an angle, so a full turn is the same direction as none. */
export const FULL_TURN = 360;

export type ResolvedColor = {
  /** What the user authored. Never overwritten by its Fallback. */
  readonly authored: OklchColor;
  /** The Fallback when the authored color is outside the sRGB region, else the authored color. */
  readonly rendered: OklchColor;
  /** The hex form of `rendered`. */
  readonly hex: string;
  readonly fellBack: boolean;
};

/**
 * culori's Oklab conversion uses the CSS Color 4 matrices rather than
 * Ottosson's originals; see `culori/src/oklab/convertOklabToLrgb.js`.
 */
function toCulori(color: OklchColor): Oklch {
  return {
    mode: "oklch",
    l: color.lightness / 100,
    c: color.chroma,
    h: color.hue,
  };
}

const toSrgb = converter("rgb");

/**
 * Half an 8-bit step. A channel this far outside [0, 1] rounds to the same hex
 * digit as one exactly on the boundary, so it still maps to a hex value; an
 * exact test would reject the sRGB primaries themselves, which sit on the
 * boundary and land just outside it once the conversion has rounded.
 */
const CHANNEL_TOLERANCE = 0.5 / 255;

/** Whether a color maps to a hex value, and so needs no Fallback. */
export function isInSrgb(color: OklchColor): boolean {
  const { r, g, b } = toSrgb(toCulori(color));
  return [r, g, b].every(
    (channel) =>
      channel >= -CHANNEL_TOLERANCE && channel <= 1 + CHANNEL_TOLERANCE,
  );
}

function toHex(color: OklchColor): string {
  return formatHex(toCulori(color));
}

/**
 * How precisely the search brackets the sRGB region's Boundary, in Chroma.
 * Well below the ~0.002 that moves a hex channel by one step.
 */
const SRGB_BOUNDARY_PRECISION = 0.00005;

/**
 * The sRGB region's Boundary: the greatest Chroma that still maps to a hex
 * value at this Lightness and Hue. Binary search, never RGB clipping —
 * clipping moves the channels independently and shifts the Hue.
 */
export function maxSrgbChroma(lightness: number, hue: number): number {
  let inside = 0;
  let outside = CHROMA_MAX;
  while (outside - inside > SRGB_BOUNDARY_PRECISION) {
    const midpoint = (inside + outside) / 2;
    if (isInSrgb({ lightness, chroma: midpoint, hue })) {
      inside = midpoint;
    } else {
      outside = midpoint;
    }
  }
  return inside;
}

/** The Fallback: the same Lightness and Hue, pulled in to the sRGB region. */
export function fallbackFor(color: OklchColor): OklchColor {
  return {
    ...color,
    chroma: Math.min(color.chroma, maxSrgbChroma(color.lightness, color.hue)),
  };
}

/** Resolve one Spectrum's Stop at one Row into a color ready to render and export. */
export function resolve(row: Row, spectrum: Spectrum): ResolvedColor {
  const stop = row.stops[spectrum.id];
  const authored: OklchColor = {
    lightness: row.lightness,
    chroma: stop.chroma,
    hue: stop.hue,
  };
  const fellBack = !isInSrgb(authored);
  const rendered = fellBack ? fallbackFor(authored) : authored;
  return { authored, rendered, hex: toHex(rendered), fellBack };
}
