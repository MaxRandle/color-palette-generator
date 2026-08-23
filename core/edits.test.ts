import { describe, expect, it } from "vitest";
import {
  addRow,
  canRemoveRow,
  removeRow,
  setChroma,
  setHue,
  setLightness,
  setPrefix,
} from "./edits";
import { socketsOf, type Palette } from "./palette";

const brand = { id: "brand", name: "brand" };

const palette: Palette = {
  prefix: "color",
  spectrums: [brand],
  rows: [
    { lightness: 95, stops: { brand: { chroma: 0.02, hue: 264 } } },
    { lightness: 60, stops: { brand: { chroma: 0.2, hue: 264 } } },
  ],
};

describe("addRow", () => {
  it("appends the new Row at the bottom of the ladder", () => {
    expect(addRow(palette).rows).toHaveLength(3);
    expect(addRow(palette).rows.slice(0, 2)).toEqual(palette.rows);
  });

  it("pre-populates the new Row with the last Row's values", () => {
    const rows = addRow(palette).rows;
    expect(rows[2]).toEqual({ lightness: 60, stops: { brand: { chroma: 0.2, hue: 264 } } });
  });

  it("keeps Socket numbers contiguous", () => {
    expect(socketsOf(addRow(palette)).map((s) => s.socket.number)).toEqual([100, 200, 300]);
  });
});

describe("removeRow", () => {
  it("removes the Row at the given Socket's index", () => {
    expect(removeRow(palette, 0).rows).toEqual([palette.rows[1]]);
  });

  it("renumbers the Sockets below the removed Row", () => {
    const three = addRow(palette);
    expect(socketsOf(removeRow(three, 1)).map((s) => s.socket.number)).toEqual([100, 200]);
  });

  it("refuses to remove the final Row", () => {
    const last: Palette = { ...palette, rows: [palette.rows[0]] };
    expect(canRemoveRow(last)).toBe(false);
    expect(removeRow(last, 0)).toBe(last);
  });

  it("allows removal while more than one Row remains", () => {
    expect(canRemoveRow(palette)).toBe(true);
  });
});

describe("setLightness", () => {
  it("replaces one Row's Lightness, leaving the rest of the ladder alone", () => {
    const edited = setLightness(palette, 1, 42.5);
    expect(edited.rows[1].lightness).toBe(42.5);
    expect(edited.rows[0]).toEqual(palette.rows[0]);
  });

  it("keeps arbitrary typed precision", () => {
    expect(setLightness(palette, 0, 33.333333).rows[0].lightness).toBe(33.333333);
  });

  it("holds Lightness inside the 0 to 100 percent range", () => {
    expect(setLightness(palette, 0, 140).rows[0].lightness).toBe(100);
    expect(setLightness(palette, 0, -8).rows[0].lightness).toBe(0);
  });
});

describe("setChroma", () => {
  it("replaces one Spectrum's Chroma at one Row", () => {
    const edited = setChroma(palette, 0, "brand", 0.31);
    expect(edited.rows[0].stops.brand).toEqual({ chroma: 0.31, hue: 264 });
    expect(edited.rows[1]).toEqual(palette.rows[1]);
  });

  it("permits Chroma beyond the sRGB region, up to 0.5", () => {
    expect(setChroma(palette, 0, "brand", 0.5).rows[0].stops.brand.chroma).toBe(0.5);
  });

  it("holds Chroma inside the 0 to 0.5 range", () => {
    expect(setChroma(palette, 0, "brand", 0.9).rows[0].stops.brand.chroma).toBe(0.5);
    expect(setChroma(palette, 0, "brand", -0.2).rows[0].stops.brand.chroma).toBe(0);
  });
});

describe("setHue", () => {
  it("replaces one Spectrum's Hue at one Row", () => {
    expect(setHue(palette, 0, "brand", 120).rows[0].stops.brand).toEqual({
      chroma: 0.02,
      hue: 120,
    });
  });

  it("wraps rather than bounding, so 370 degrees is 10 degrees", () => {
    expect(setHue(palette, 0, "brand", 370).rows[0].stops.brand.hue).toBe(10);
  });

  it("wraps negative angles back around the circle", () => {
    expect(setHue(palette, 0, "brand", -30).rows[0].stops.brand.hue).toBe(330);
  });

  it("wraps a full turn to zero", () => {
    expect(setHue(palette, 0, "brand", 360).rows[0].stops.brand.hue).toBe(0);
    expect(setHue(palette, 0, "brand", 720).rows[0].stops.brand.hue).toBe(0);
  });
});

describe("setPrefix", () => {
  it("renames the Palette's custom properties", () => {
    expect(setPrefix(palette, "brand").prefix).toBe("brand");
  });

  it("refuses a prefix that would not be a CSS identifier", () => {
    expect(setPrefix(palette, "my brand")).toBe(palette);
    expect(setPrefix(palette, "")).toBe(palette);
  });
});
