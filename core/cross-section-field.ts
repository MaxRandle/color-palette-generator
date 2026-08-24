/**
 * The Cross-section's color field: the slice interior painted per pixel, so the
 * user can orient by Hue without reading the angle off the wheel.
 *
 * The field is decoration; the shape is the specification. Pixels outside the
 * sRGB region are painted with their Fallback — never by RGB clipping, which
 * shifts Hue and would corrupt the angular axis. A consequence worth relying
 * on: every point beyond the sRGB Boundary at one Hue paints as the same color,
 * so the field goes radially flat there and the flatness marks the edge.
 */

import { CHROMA_MAX, type OklchColor } from "./color";
import {
  DEGREES,
  chromaAndHueAt,
  chromaAt,
  srgbRegionBoundary,
  visibleGamutBoundary,
} from "./cross-section";

/**
 * Oklch to sRGB bytes, inlined from the CSS Color 4 matrices rather than run
 * through culori. A slice is a hundred thousand pixels and is repainted on
 * every Lightness edit; culori's per-color object churn is what made that not
 * feel live. `culori` remains the reference this is tested against, so the two
 * cannot drift.
 *
 * It must only be handed colors already inside the sRGB region: the Fallback is
 * what puts them there. A channel a hair outside saturates at its byte, which
 * is the 8-bit rounding every color goes through, not a gamut decision.
 */
export function srgbBytes({
  lightness,
  chroma,
  hue,
}: OklchColor): readonly [number, number, number] {
  const angle = hue * DEGREES;
  const l = lightness / 100;
  const a = chroma * Math.cos(angle);
  const b = chroma * Math.sin(angle);

  const long = (l + 0.3963377773761749 * a + 0.2158037573099136 * b) ** 3;
  const medium = (l - 0.1055613458156586 * a - 0.0638541728258133 * b) ** 3;
  const short = (l - 0.0894841775298119 * a - 1.2914855480194092 * b) ** 3;

  return [
    encode(
      4.0767416360759574 * long -
        3.3077115392580616 * medium +
        0.2309699031821044 * short,
    ),
    encode(
      -1.2684379732850317 * long +
        2.6097573492876887 * medium -
        0.3413193760026573 * short,
    ),
    encode(
      -0.0041960761386756 * long -
        0.7034186179359362 * medium +
        1.7076146940746117 * short,
    ),
  ];
}

/** One linear-light channel as an 8-bit sRGB byte. */
function encode(channel: number): number {
  const magnitude = Math.abs(channel);
  const encoded =
    magnitude > 0.0031308
      ? (Math.sign(channel) || 1) * (1.055 * magnitude ** (1 / 2.4) - 0.055)
      : channel * 12.92;
  return Math.max(0, Math.min(255, Math.round(encoded * 255)));
}

const CHANNELS = 4;
const OPAQUE = 255;

/**
 * The slice at one Lightness as RGBA pixels for a square canvas of this side,
 * in the same coordinates `plot` draws the vector layer in. Points outside the
 * Visible gamut are left transparent, so the field is the shape: the edge is
 * feathered across the pixel it falls in rather than left to stair-step.
 *
 * A 320-pixel slice costs around 9ms, which is why the Lightness edit that
 * triggers it can be handled where it happens rather than deferred.
 */
export function sliceField(
  lightness: number,
  size: number,
): Uint8ClampedArray<ArrayBuffer> {
  const pixels = new Uint8ClampedArray(size * size * CHANNELS);
  const visible = visibleGamutBoundary(lightness);
  const srgb = srgbRegionBoundary(lightness);
  /** How much Chroma one pixel spans, the width the edge is feathered over. */
  const perPixel = CHROMA_MAX / (size / 2);

  let index = 0;
  for (let row = 0; row < size; row++) {
    for (let column = 0; column < size; column++, index += CHANNELS) {
      // The pixel's center, which is the point it stands for.
      const { chroma, hue } = chromaAndHueAt(column + 0.5, row + 0.5, size);
      const coverage = (chromaAt(visible, hue) - chroma) / perPixel + 0.5;
      if (coverage <= 0) continue;

      const [red, green, blue] = srgbBytes({
        lightness,
        // The Fallback: Chroma pulled back to the sRGB region's Boundary,
        // holding Lightness and Hue. It is read off the sampled Boundary
        // rather than searched for again per pixel, which is `fallbackFor` to
        // within the sampling — near enough that the two agree to the byte.
        chroma: Math.min(chroma, chromaAt(srgb, hue)),
        hue,
      });
      pixels[index] = red;
      pixels[index + 1] = green;
      pixels[index + 2] = blue;
      pixels[index + 3] = Math.min(1, coverage) * OPAQUE;
    }
  }
  return pixels;
}
