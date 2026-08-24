import { describe, expect, it } from "vitest";
import { computeMaxChromaTable, whitePointChromaticity } from "./optimal-solid";
import { MAX_CHROMA_TABLE_BASE64 } from "./max-chroma-table.generated";
import { encodeTable } from "./table";

describe("the vendored CIE data", () => {
  it("integrates to the D65 white point, so the two tables line up by wavelength", () => {
    // CSS Color 4's D65: x = 0.3127, y = 0.3290. Joining the 1 nm
    // color-matching functions to the 5 nm illuminant by index rather than by
    // wavelength is the classic way to get this wrong, and it shows up here.
    const { x, y } = whitePointChromaticity();
    expect(x).toBeCloseTo(0.3127, 4);
    expect(y).toBeCloseTo(0.329, 4);
  });
});

describe("the committed table", () => {
  it("is what the generator produces today", () => {
    // The same check CI runs by regenerating and diffing; here so that a change
    // to the generator fails locally rather than in review.
    expect(encodeTable(computeMaxChromaTable())).toBe(MAX_CHROMA_TABLE_BASE64);
  });
});
