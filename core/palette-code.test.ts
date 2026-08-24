import { describe, expect, it } from "vitest";
import { decodePalette, encodePalette } from "./palette-code";
import { resolve } from "./color";
import type { Palette } from "./palette";

const palette: Palette = {
  prefix: "color",
  spectrums: [{ id: "brand", name: "brand" }],
  rows: [
    { lightness: 95, stops: { brand: { chroma: 0.02, hue: 264 } } },
    { lightness: 60, stops: { brand: { chroma: 0.2, hue: 264 } } },
    { lightness: 25, stops: { brand: { chroma: 0.12, hue: 264 } } },
  ],
};

describe("encodePalette / decodePalette", () => {
  it("round-trips a Palette, prefix included", () => {
    expect(decodePalette(encodePalette(palette))).toEqual(palette);
  });
});

describe("the version marker", () => {
  it("opens every code, so today's links can be recognised tomorrow", () => {
    expect(encodePalette(palette)).toMatch(/^1~/);
  });

  it("refuses a code from a format this build does not know", () => {
    const fromTheFuture = encodePalette(palette).replace(/^1~/, "2~");
    expect(decodePalette(fromTheFuture)).toBeNull();
  });
});

describe("a code that is not a palette", () => {
  it.each([
    ["empty", ""],
    ["not a code at all", "hello world"],
    ["missing its Rows", "1~color~brand:brand"],
    ["a Row short of its numbers", "1~color~brand:brand~95,0.02"],
    ["a Row whose numbers are not numbers", "1~color~brand:brand~95,red,264"],
    ["an empty prefix, which would emit --100", "1~~brand:brand~95,0.02,264"],
    ["a prefix that would break the declaration", "1~my%20brand~b:b~95,0.02,264"],
    ["a Lightness past 100%", "1~color~brand:brand~140,0.02,264"],
    ["a Chroma past the authoring ceiling", "1~color~brand:brand~95,0.8,264"],
    ["a Hue outside a single turn", "1~color~brand:brand~95,0.02,400"],
    ["a Spectrum with no id", "1~color~:brand~95,0.02,264"],
  ])("refuses one %s", (_name, code) => {
    expect(decodePalette(code)).toBeNull();
  });
});

describe("what a code carries", () => {
  it("stores the authored Chroma of a Stop outside the sRGB region", () => {
    const outside: Palette = {
      ...palette,
      rows: [{ lightness: 95, stops: { brand: { chroma: 0.4, hue: 264 } } }],
    };
    expect(resolve(outside.rows[0], outside.spectrums[0]).fellBack).toBe(true);
    expect(decodePalette(encodePalette(outside))?.rows[0]).toEqual({
      lightness: 95,
      stops: { brand: { chroma: 0.4, hue: 264 } },
    });
  });

  it("round-trips a prefix and Spectrum names that need escaping", () => {
    const awkward: Palette = {
      ...palette,
      prefix: "márca-tone",
      spectrums: [{ id: "a~b", name: "warm, grey" }],
      rows: [{ lightness: 50, stops: { "a~b": { chroma: 0.1, hue: 30 } } }],
    };
    expect(decodePalette(encodePalette(awkward))).toEqual(awkward);
  });

  it("round-trips several Spectrums, each keeping its own Stop", () => {
    const two: Palette = {
      ...palette,
      spectrums: [
        { id: "brand", name: "brand" },
        { id: "accent", name: "accent" },
      ],
      rows: [
        {
          lightness: 60,
          stops: {
            brand: { chroma: 0.2, hue: 264 },
            accent: { chroma: 0.11, hue: 30 },
          },
        },
      ],
    };
    expect(decodePalette(encodePalette(two))).toEqual(two);
  });
});
