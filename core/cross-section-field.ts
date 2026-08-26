/**
 * The Cross-section's color field: the slice interior painted per pixel, so the
 * user can orient by Hue without reading the angle off the wheel.
 *
 * The field is decoration; the shape is the specification. It is painted in the
 * gamut of the screen it is being shown on rather than always in sRGB, so a
 * wide-gamut screen gets the Chroma it can actually show. Pixels past that
 * gamut have their Chroma pulled back to its Boundary — never RGB clipping,
 * which shifts Hue and would corrupt the angular axis. A consequence worth
 * relying on: every point beyond the Boundary at one Hue paints as the same
 * color, so the field goes radially flat there and the flatness marks the edge.
 * The sRGB region's contour is drawn over the field by the chart, so on a wide
 * screen it sits plainly inside where the field flattens: what is exportable
 * and what is showable stop being the same line.
 */

import { CHROMA_MAX, type Gamut, type OklchColor } from "./color";
import {
  DEGREES,
  chromaAndHueAt,
  chromaAt,
  regionBoundary,
  visibleGamutBoundary,
} from "./cross-section";

/**
 * Oklab's cube-rooted cone responses to each gamut's linear channels, one row
 * per channel, flat so the inner loop can read it without unpacking anything.
 *
 * The sRGB rows are the CSS Color 4 matrices; the Display P3 rows are the same
 * transform carried on through to P3's primaries. `culori` remains the
 * reference both are tested against, so they cannot drift from it.
 */
const MATRIX: Record<Gamut, Float64Array> = {
  srgb: Float64Array.of(
    4.0767416360759574, -3.3077115392580616, 0.2309699031821044,
    -1.2684379732850317, 2.6097573492876887, -0.3413193760026573,
    -0.0041960761386756, -0.7034186179359362, 1.7076146940746117,
  ),
  "display-p3": Float64Array.of(
    3.1277689713618737, -2.2571357625916377, 0.1293667912297652,
    -1.0910090184377983, 2.4133317103069221, -0.3223226918691251,
    -0.0260108019385705, -0.5080413317041669, 1.5340521336427377,
  ),
};

/**
 * Oklch to a gamut's bytes, inlined rather than run through culori. A slice is
 * a hundred thousand pixels and is repainted on every Lightness edit; culori's
 * per-color object churn is what made that not feel live.
 *
 * It must only be handed colors already inside the gamut asked for: pulling
 * them in is what puts them there. A channel a hair outside saturates at its
 * byte, which is the 8-bit rounding every color goes through, not a gamut
 * decision.
 */
export function gamutBytes(
  { lightness, chroma, hue }: OklchColor,
  gamut: Gamut,
): readonly [number, number, number] {
  const angle = hue * DEGREES;
  const l = lightness / 100;
  const a = chroma * Math.cos(angle);
  const b = chroma * Math.sin(angle);

  const long = (l + 0.3963377773761749 * a + 0.2158037573099136 * b) ** 3;
  const medium = (l - 0.1055613458156586 * a - 0.0638541728258133 * b) ** 3;
  const short = (l - 0.0894841775298119 * a - 1.2914855480194092 * b) ** 3;

  const m = MATRIX[gamut];
  return [
    encode(m[0] * long + m[1] * medium + m[2] * short),
    encode(m[3] * long + m[4] * medium + m[5] * short),
    encode(m[6] * long + m[7] * medium + m[8] * short),
  ];
}

/**
 * One linear-light channel as an 8-bit byte. sRGB's transfer function, which
 * Display P3 shares: the two differ in their primaries, not in their curve.
 */
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
  gamut: Gamut,
): Uint8ClampedArray<ArrayBuffer> {
  const pixels = new Uint8ClampedArray(size * size * CHANNELS);
  const visible = visibleGamutBoundary(lightness);
  const showable = regionBoundary(lightness, gamut);
  /** How much Chroma one pixel spans, the width the edge is feathered over. */
  const perPixel = CHROMA_MAX / (size / 2);

  let index = 0;
  for (let row = 0; row < size; row++) {
    for (let column = 0; column < size; column++, index += CHANNELS) {
      // The pixel's center, which is the point it stands for.
      const { chroma, hue } = chromaAndHueAt(column + 0.5, row + 0.5, size);
      const coverage = (chromaAt(visible, hue) - chroma) / perPixel + 0.5;
      if (coverage <= 0) continue;

      const [red, green, blue] = gamutBytes(
        {
          lightness,
          // Chroma pulled back to the gamut's own Boundary, holding Lightness
          // and Hue. It is read off the sampled Boundary rather than searched
          // for again per pixel, which is `pulledInto` to within the sampling
          // — near enough that the two agree to the byte.
          chroma: Math.min(chroma, chromaAt(showable, hue)),
          hue,
        },
        gamut,
      );
      pixels[index] = red;
      pixels[index + 1] = green;
      pixels[index + 2] = blue;
      pixels[index + 3] = Math.min(1, coverage) * OPAQUE;
    }
  }
  return pixels;
}
