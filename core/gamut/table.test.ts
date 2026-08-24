import { describe, expect, it } from "vitest";
import {
  CHROMA_UNIT,
  HUE_STEPS,
  LIGHTNESS_STEPS,
  decodeTable,
  encodeTable,
  emptyTable,
  interpolateMaxChroma,
  setMaxChroma,
} from "./table";

/** A table whose stored Chroma is a function of the grid coordinates. */
function tableOf(chromaAt: (lightness: number, hue: number) => number) {
  const table = emptyTable();
  for (let l = 0; l < LIGHTNESS_STEPS; l += 1) {
    for (let h = 0; h < HUE_STEPS; h += 1) {
      setMaxChroma(table, l, h, chromaAt(l * 0.5, h));
    }
  }
  return table;
}

describe("interpolateMaxChroma", () => {
  it("reads the stored value at a grid point", () => {
    const table = tableOf((lightness) => lightness / 1000);
    expect(interpolateMaxChroma(table, 60, 200)).toBeCloseTo(0.06, 10);
  });

  it("interpolates linearly between two Lightness rows", () => {
    const table = tableOf((lightness) => lightness / 1000);
    // Half way between the 60% and 60.5% rows.
    expect(interpolateMaxChroma(table, 60.25, 200)).toBeCloseTo(0.06025, 10);
  });

  it("interpolates linearly between two Hue columns", () => {
    const table = tableOf((_lightness, hue) => hue / 10000);
    expect(interpolateMaxChroma(table, 50, 200.5)).toBeCloseTo(0.02005, 10);
  });

  it("interpolates bilinearly across both axes", () => {
    const table = tableOf((lightness, hue) => (lightness + hue) / 10000);
    expect(interpolateMaxChroma(table, 60.25, 200.5)).toBeCloseTo(0.026075, 10);
  });

  it("wraps across 360 degrees, interpolating from the last column back to the first", () => {
    const table = tableOf((_lightness, hue) => (hue === 0 ? 0.2 : 0.1));
    expect(interpolateMaxChroma(table, 50, 359.5)).toBeCloseTo(0.15, 10);
    expect(interpolateMaxChroma(table, 50, 360)).toBeCloseTo(0.2, 10);
    expect(interpolateMaxChroma(table, 50, 720.5)).toBeCloseTo(0.15, 10);
    expect(interpolateMaxChroma(table, 50, -0.5)).toBeCloseTo(0.15, 10);
  });

  it("clamps Lightness to the ends of the table", () => {
    const table = tableOf((lightness) => lightness / 1000);
    expect(interpolateMaxChroma(table, -10, 0)).toBe(0);
    expect(interpolateMaxChroma(table, 110, 0)).toBeCloseTo(0.1, 10);
  });

  it("quantises to the table's Chroma unit", () => {
    const table = tableOf(() => 0.123456789);
    expect(interpolateMaxChroma(table, 50, 50)).toBeCloseTo(0.12346, 10);
    expect(CHROMA_UNIT).toBe(0.00001);
  });
});

describe("encoding", () => {
  it("round-trips a table through base64", () => {
    const table = tableOf((lightness, hue) => (lightness + hue) / 10000);
    expect(decodeTable(encodeTable(table))).toEqual(table);
  });

  it("decodes the same bytes on a big-endian host", () => {
    // Encoding is explicitly little-endian, so the base64 does not depend on
    // the host that generated it.
    const table = emptyTable();
    setMaxChroma(table, 0, 0, 0.00258);
    expect(encodeTable(table).slice(0, 4)).toBe("AgEA");
  });
});
