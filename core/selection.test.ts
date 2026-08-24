import { describe, expect, it } from "vitest";
import { readingAt, selectedIndex } from "./selection";
import type { Palette } from "./palette";

const SPECTRUM = { id: "brand", name: "brand" };

const PALETTE: Palette = {
  prefix: "color",
  spectrums: [SPECTRUM],
  rows: [
    { lightness: 95, stops: { brand: { chroma: 0.02, hue: 264 } } },
    { lightness: 60, stops: { brand: { chroma: 0.2, hue: 137 } } },
  ],
};

describe("readingAt", () => {
  it("reads the selected Row's Socket number, Lightness, Chroma and Hue", () => {
    expect(readingAt(PALETTE, SPECTRUM, 1)).toEqual({
      socket: { number: 200 },
      color: { lightness: 60, chroma: 0.2, hue: 137 },
    });
  });
});

describe("selectedIndex", () => {
  it("is the selected position while the ladder holds it", () => {
    expect(selectedIndex(PALETTE, 0)).toBe(0);
    expect(selectedIndex(PALETTE, 1)).toBe(1);
  });

  it("falls back to the last Row when the selected one has been removed", () => {
    // Removing a Row renumbers the Sockets below it, so a selection past the
    // end has to land somewhere: exactly one Row is selected at all times.
    expect(selectedIndex(PALETTE, 2)).toBe(1);
    expect(selectedIndex(PALETTE, 9)).toBe(1);
  });
});

describe("readingAt", () => {
  it("reads the last Row when the selected one has been removed", () => {
    expect(readingAt(PALETTE, SPECTRUM, 2).socket).toEqual({ number: 200 });
  });
});
