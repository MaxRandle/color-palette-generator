/**
 * The shape of the precomputed Visible gamut table, per ADR-0002: maximum
 * Chroma sampled at 1 degree of Hue by 0.5% Lightness, quantised into a
 * `Uint16Array`. This module knows the table's layout and nothing about how
 * the boundary was derived — the generator fills a table, `maxChroma()` reads
 * one.
 */

/** One column per degree of Hue. */
export const HUE_STEPS = 360;

/** One row per 0.5% of Lightness, from 0% to 100% inclusive. */
export const LIGHTNESS_STEPS = 201;

/** The Lightness, in percent, between two rows. */
export const LIGHTNESS_STEP = 100 / (LIGHTNESS_STEPS - 1);

/**
 * The Chroma one stored unit represents. Two orders of magnitude below the
 * ~0.002 that is just noticeable, and 0.5 (the authoring ceiling) still fits
 * in 16 bits.
 */
export const CHROMA_UNIT = 0.00001;

/** Maximum Chroma per grid point, row-major with Lightness as the row. */
export type MaxChromaTable = Uint16Array;

export function emptyTable(): MaxChromaTable {
  return new Uint16Array(LIGHTNESS_STEPS * HUE_STEPS);
}

function indexOf(lightnessStep: number, hueStep: number): number {
  return lightnessStep * HUE_STEPS + hueStep;
}

/** Store one grid point, in Chroma. */
export function setMaxChroma(
  table: MaxChromaTable,
  lightnessStep: number,
  hueStep: number,
  chroma: number,
): void {
  table[indexOf(lightnessStep, hueStep)] = Math.min(
    Math.round(chroma / CHROMA_UNIT),
    65535,
  );
}

/** Read one grid point, in Chroma. */
export function maxChromaAtGridPoint(
  table: MaxChromaTable,
  lightnessStep: number,
  hueStep: number,
): number {
  return table[indexOf(lightnessStep, hueStep)] * CHROMA_UNIT;
}

/**
 * The greatest Chroma the table holds at this Lightness and Hue, bilinearly
 * interpolated. Hue wraps across 360 degrees; Lightness clamps, so the anchored
 * zeroes at 0% and 100% are the answer beyond either end.
 */
export function interpolateMaxChroma(
  table: MaxChromaTable,
  lightness: number,
  hue: number,
): number {
  const l = Math.min(Math.max(lightness, 0), 100) / LIGHTNESS_STEP;
  const lowerL = Math.min(Math.floor(l), LIGHTNESS_STEPS - 1);
  const upperL = Math.min(lowerL + 1, LIGHTNESS_STEPS - 1);
  const alongL = l - lowerL;

  const h = (((hue % HUE_STEPS) + HUE_STEPS) % HUE_STEPS);
  const lowerH = Math.floor(h);
  const upperH = (lowerH + 1) % HUE_STEPS;
  const alongH = h - lowerH;

  const lower =
    maxChromaAtGridPoint(table, lowerL, lowerH) * (1 - alongH) +
    maxChromaAtGridPoint(table, lowerL, upperH) * alongH;
  const upper =
    maxChromaAtGridPoint(table, upperL, lowerH) * (1 - alongH) +
    maxChromaAtGridPoint(table, upperL, upperH) * alongH;
  return lower * (1 - alongL) + upper * alongL;
}

/**
 * The table's bytes as base64, little-endian so the text does not depend on the
 * host that generated it. Text rather than a `.bin` file because it is then one
 * committed artifact that every bundler already knows how to carry; it decodes
 * back to the `Uint16Array` of ADR-0002 before anything reads it.
 */
export function encodeTable(table: MaxChromaTable): string {
  const bytes = new Uint8Array(table.length * 2);
  const view = new DataView(bytes.buffer);
  table.forEach((value, index) => view.setUint16(index * 2, value, true));
  let binary = "";
  bytes.forEach((byte) => {
    binary += String.fromCharCode(byte);
  });
  return btoa(binary);
}

export function decodeTable(base64: string): MaxChromaTable {
  const binary = atob(base64);
  const bytes = Uint8Array.from(binary, (character) => character.charCodeAt(0));
  const view = new DataView(bytes.buffer);
  const table = emptyTable();
  for (let index = 0; index < table.length; index += 1) {
    table[index] = view.getUint16(index * 2, true);
  }
  return table;
}
