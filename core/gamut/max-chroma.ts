/**
 * The Visible gamut, as one function. Per ADR-0002 nothing outside this module
 * knows what the gamut is or how it was derived: the boundary is a precomputed
 * table, and this is the only way to read it.
 */

import { MAX_CHROMA_TABLE_BASE64 } from "./max-chroma-table.generated";
import { decodeTable, interpolateMaxChroma } from "./table";

const TABLE = decodeTable(MAX_CHROMA_TABLE_BASE64);

/**
 * The greatest Chroma the Visible gamut holds at this Lightness and Hue.
 * Lightness is a percentage and Hue is in degrees, wrapping across 360. Black
 * and white have no Chroma at all, so 0% and 100% Lightness return zero.
 */
export function maxChroma(lightness: number, hue: number): number {
  return interpolateMaxChroma(TABLE, lightness, hue);
}
