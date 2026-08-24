import { describe, expect, it } from "vitest";
import {
  readingAt,
  selectedIndex,
  selectionAfterMoving,
  selectionAfterRemoving,
} from "./selection";
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

  it("reads the last Row when the selected one has been removed", () => {
    expect(readingAt(PALETTE, SPECTRUM, 2).socket).toEqual({ number: 200 });
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

describe("selectionAfterRemoving", () => {
  it("follows the selected Row up the ladder when one above it goes", () => {
    // The Row the user was working on is unchanged; only its Socket is.
    expect(selectionAfterRemoving(2, 0)).toBe(1);
  });

  it("leaves the selection where it is when a Row below it goes", () => {
    expect(selectionAfterRemoving(1, 2)).toBe(1);
  });

  it("stays put when the selected Row itself goes, taking the one that slides up", () => {
    expect(selectionAfterRemoving(1, 1)).toBe(1);
  });
});

describe("selectionAfterMoving", () => {
  it("rides along with the selected Row into its new Socket", () => {
    expect(selectionAfterMoving(0, 0, 2)).toBe(2);
    expect(selectionAfterMoving(2, 2, 0)).toBe(0);
  });

  it("follows the selected Row up when a Row above it is moved below it", () => {
    expect(selectionAfterMoving(2, 0, 3)).toBe(1);
  });

  it("follows the selected Row down when a Row below it is moved above it", () => {
    expect(selectionAfterMoving(1, 3, 0)).toBe(2);
  });

  it("leaves the selection alone when the move happens clear of it", () => {
    expect(selectionAfterMoving(0, 1, 2)).toBe(0);
    expect(selectionAfterMoving(3, 0, 1)).toBe(3);
  });
});
