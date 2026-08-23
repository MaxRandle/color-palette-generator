import { converter, formatHex, type Oklch } from "culori";
import type { Row, Spectrum } from "./palette";

/**
 * A color in the authoring space. Lightness is a percentage (0–100), Chroma is
 * unitless (0–0.35), Hue is degrees (0–360).
 */
export type OklchColor = {
  readonly lightness: number;
  readonly chroma: number;
  readonly hue: number;
};

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
 * How precisely the Fallback search brackets the sRGB boundary, in Chroma.
 * Well below the ~0.002 that moves a hex channel by one step.
 */
const FALLBACK_PRECISION = 0.00005;

/**
 * The Fallback: the same Lightness and Hue at the greatest Chroma that still
 * maps to a hex value. Binary search, never RGB clipping — clipping moves the
 * channels independently and shifts the Hue.
 */
function fallbackFor(color: OklchColor): OklchColor {
  let inside = 0;
  let outside = color.chroma;
  while (outside - inside > FALLBACK_PRECISION) {
    const midpoint = (inside + outside) / 2;
    if (isInSrgb({ ...color, chroma: midpoint })) {
      inside = midpoint;
    } else {
      outside = midpoint;
    }
  }
  return { ...color, chroma: inside };
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
