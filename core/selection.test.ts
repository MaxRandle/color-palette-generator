import { describe, expect, it } from "vitest";
import {
  activeSpectrum,
  activeSpectrumAfterMoving,
  activeSpectrumAfterRemoving,
  activeSpectrumIndex,
  heldSelection,
  readingAt,
  selectedRowAfterMoving,
  selectedRowAfterRemoving,
  selectedRowIndex,
  type Selection,
} from "./selection";
import type { Palette } from "./palette";

const BRAND = { id: "brand", name: "brand", profileId: "p1" };
const ACCENT = { id: "s2", name: "accent", profileId: "p2" };

const PALETTE: Palette = {
  prefix: "color",
  profiles: [
    { id: "p1", name: "vibrant" },
    { id: "p2", name: "subtle" },
  ],
  spectrums: [BRAND, ACCENT],
  rows: [
    {
      lightness: 95,
      chromas: { p1: 0.02, p2: 0.05 },
      stops: { brand: { hue: 264 }, s2: { hue: 30 } },
    },
    {
      lightness: 60,
      chromas: { p1: 0.2, p2: 0.11 },
      stops: { brand: { hue: 137 }, s2: { hue: 30 } },
    },
  ],
};

function at(row: number, spectrum: number): Selection {
  return { row, spectrum };
}

describe("readingAt", () => {
  it("reads the selected Row's Socket number, Lightness, Chroma and Hue", () => {
    expect(readingAt(PALETTE, at(1, 0))).toEqual({
      socket: { number: 200 },
      color: { lightness: 60, chroma: 0.2, hue: 137 },
    });
  });

  it("reads the Active Spectrum's Stop, so the Cross-section follows the tab", () => {
    expect(readingAt(PALETTE, at(1, 1)).color).toEqual({
      lightness: 60,
      chroma: 0.11,
      hue: 30,
    });
  });

  it("reads the last Row when the selected one has been removed", () => {
    expect(readingAt(PALETTE, at(2, 0)).socket).toEqual({ number: 200 });
  });
});

describe("selectedRowIndex", () => {
  it("is the selected position while the ladder holds it", () => {
    expect(selectedRowIndex(PALETTE, at(0, 0))).toBe(0);
    expect(selectedRowIndex(PALETTE, at(1, 0))).toBe(1);
  });

  it("falls back to the last Row when the selected one has been removed", () => {
    // Removing a Row renumbers the Sockets below it, so a selection past the
    // end has to land somewhere: exactly one Row is selected at all times.
    expect(selectedRowIndex(PALETTE, at(2, 0))).toBe(1);
    expect(selectedRowIndex(PALETTE, at(9, 0))).toBe(1);
  });

  it("is unaffected by how many Spectrums the Palette holds", () => {
    expect(selectedRowIndex(PALETTE, at(1, 9))).toBe(1);
  });
});

describe("activeSpectrumIndex", () => {
  it("is the Active position while the Palette holds it", () => {
    expect(activeSpectrumIndex(PALETTE, at(0, 0))).toBe(0);
    expect(activeSpectrumIndex(PALETTE, at(0, 1))).toBe(1);
  });

  it("comes to rest on the last Spectrum when the Active one has gone", () => {
    // The Row index and the Spectrum index clamp independently.
    expect(activeSpectrumIndex(PALETTE, at(9, 5))).toBe(1);
  });

  it("names the Spectrum the ladder is editing", () => {
    expect(activeSpectrum(PALETTE, at(0, 1))).toBe(ACCENT);
    expect(activeSpectrum(PALETTE, at(0, 7))).toBe(ACCENT);
  });
});

describe("selectedRowAfterRemoving", () => {
  it("follows the selected Row up the ladder when one above it goes", () => {
    // The Row the user was working on is unchanged; only its Socket is.
    expect(selectedRowAfterRemoving(2, 0)).toBe(1);
  });

  it("leaves the selection where it is when a Row below it goes", () => {
    expect(selectedRowAfterRemoving(1, 2)).toBe(1);
  });

  it("stays put when the selected Row itself goes, taking the one that slides up", () => {
    expect(selectedRowAfterRemoving(1, 1)).toBe(1);
  });
});

describe("activeSpectrumAfterRemoving", () => {
  it("keeps the same Spectrum Active when one before it goes", () => {
    expect(activeSpectrumAfterRemoving(2, 0)).toBe(1);
  });

  it("leaves the Active Spectrum alone when one after it goes", () => {
    expect(activeSpectrumAfterRemoving(1, 2)).toBe(1);
  });

  it("lands on whichever slides into its place when the Active one goes", () => {
    expect(activeSpectrumAfterRemoving(1, 1)).toBe(1);
  });
});

describe("activeSpectrumAfterMoving", () => {
  it("stays on the Spectrum the user was editing when it is the one dragged", () => {
    expect(activeSpectrumAfterMoving(0, 0, 2)).toBe(2);
    expect(activeSpectrumAfterMoving(2, 2, 0)).toBe(0);
  });

  it("shifts by the one place a Spectrum dragged past it displaced it", () => {
    expect(activeSpectrumAfterMoving(2, 0, 3)).toBe(1);
    expect(activeSpectrumAfterMoving(1, 3, 0)).toBe(2);
  });

  it("leaves the Active Spectrum alone when the move happens clear of it", () => {
    expect(activeSpectrumAfterMoving(0, 1, 2)).toBe(0);
    expect(activeSpectrumAfterMoving(3, 0, 1)).toBe(3);
  });
});

describe("selectedRowAfterMoving", () => {
  it("rides along with the selected Row into its new Socket", () => {
    expect(selectedRowAfterMoving(0, 0, 2)).toBe(2);
    expect(selectedRowAfterMoving(2, 2, 0)).toBe(0);
  });

  it("follows the selected Row up when a Row above it is moved below it", () => {
    expect(selectedRowAfterMoving(2, 0, 3)).toBe(1);
  });

  it("follows the selected Row down when a Row below it is moved above it", () => {
    expect(selectedRowAfterMoving(1, 3, 0)).toBe(2);
  });

  it("leaves the selection alone when the move happens clear of it", () => {
    expect(selectedRowAfterMoving(0, 1, 2)).toBe(0);
    expect(selectedRowAfterMoving(3, 0, 1)).toBe(3);
  });
});

describe("heldSelection", () => {
  it("leaves a pair the Palette holds alone", () => {
    expect(heldSelection(PALETTE, at(1, 1))).toEqual(at(1, 1));
  });

  it("comes to rest on the last Row and the last Spectrum, rather than wrapping", () => {
    expect(heldSelection(PALETTE, at(7, 4))).toEqual(at(1, 1));
  });

  it("clamps a step off the top edge to the first Row", () => {
    expect(heldSelection(PALETTE, at(-1, 0))).toEqual(at(0, 0));
  });

  it("clamps a step off the left edge to the first Spectrum", () => {
    expect(heldSelection(PALETTE, at(0, -1))).toEqual(at(0, 0));
  });

  it("clamps each index against its own axis", () => {
    expect(heldSelection(PALETTE, at(9, -1))).toEqual(at(1, 0));
  });
});
