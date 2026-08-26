import { describe, expect, it } from "vitest";
import { cellsOf, tileRowsOf } from "./cells";
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

describe("tileRowsOf", () => {
  it("gives one grid row per Socket, in ladder order", () => {
    expect(tileRowsOf(PALETTE).map((each) => each.socket.number)).toEqual([100, 200]);
  });

  it("lines a Socket's Tiles up across every Spectrum, in Spectrum order", () => {
    const [first] = tileRowsOf(PALETTE);
    expect(first.cells.map((cell) => cell.spectrum)).toEqual([BRAND, ACCENT]);
    expect(first.cells.map((cell) => cell.color.authored)).toEqual([
      { lightness: 95, chroma: 0.02, hue: 264 },
      { lightness: 95, chroma: 0.05, hue: 30 },
    ]);
  });

  it("shows the same Tiles the per-Spectrum ramp does, transposed", () => {
    const rows = tileRowsOf(PALETTE);
    expect(rows.map((each) => each.cells[1])).toEqual(cellsOf(PALETTE, ACCENT));
  });
});
