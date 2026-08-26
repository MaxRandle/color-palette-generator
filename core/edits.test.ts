import { describe, expect, it } from "vitest";
import {
  addRow,
  addSpectrum,
  canRemoveSpectrum,
  canMoveRow,
  canRemoveRow,
  destinationIndex,
  moveRow,
  removeRow,
  removeSpectrum,
  renameSpectrum,
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

describe("moveRow", () => {
  const three: Palette = {
    ...palette,
    rows: [
      { lightness: 95, stops: { brand: { chroma: 0.02, hue: 264 } } },
      { lightness: 60, stops: { brand: { chroma: 0.2, hue: 264 } } },
      { lightness: 20, stops: { brand: { chroma: 0.11, hue: 264 } } },
    ],
  };

  it("drops the Row into the destination Socket, closing the gap behind it", () => {
    expect(moveRow(three, 0, 2).rows).toEqual([three.rows[1], three.rows[2], three.rows[0]]);
  });

  it("moves a Row up the ladder as well as down", () => {
    expect(moveRow(three, 2, 0).rows).toEqual([three.rows[2], three.rows[0], three.rows[1]]);
  });

  it("carries the Row's Lightness with it into the new Socket", () => {
    // ADR-0001: a Row is its Lightness plus every Spectrum's Stop, moving as one.
    const moved = moveRow(three, 0, 2);
    expect(moved.rows[2].lightness).toBe(95);
    expect(moved.rows[2].stops.brand).toEqual({ chroma: 0.02, hue: 264 });
  });

  it("keeps Socket numbers contiguous and in order", () => {
    expect(socketsOf(moveRow(three, 0, 2)).map((s) => s.socket.number)).toEqual([100, 200, 300]);
  });

  it("gives the moved Row the destination Socket's number", () => {
    const [, , bottom] = socketsOf(moveRow(three, 0, 2));
    expect(bottom.socket.number).toBe(300);
    expect(bottom.row).toEqual(three.rows[0]);
  });

  it("holds a destination past either end of the ladder at the end Row", () => {
    expect(moveRow(three, 1, 9).rows).toEqual([three.rows[0], three.rows[2], three.rows[1]]);
    expect(moveRow(three, 1, -4).rows).toEqual([three.rows[1], three.rows[0], three.rows[2]]);
  });

  it("leaves the Palette alone when the Row is already in that Socket", () => {
    expect(moveRow(three, 1, 1)).toBe(three);
  });

  it("refuses to move a lone Row, which has no other Socket to go to", () => {
    const alone: Palette = { ...palette, rows: [palette.rows[0]] };
    expect(canMoveRow(alone)).toBe(false);
    expect(moveRow(alone, 0, 1)).toBe(alone);
  });

  it("allows a move while more than one Row is in the ladder", () => {
    expect(canMoveRow(palette)).toBe(true);
  });
});

describe("destinationIndex", () => {
  it("is the destination while the ladder reaches that far", () => {
    expect(destinationIndex(palette, 0)).toBe(0);
    expect(destinationIndex(palette, 1)).toBe(1);
  });

  it("comes to rest on the end Row when the destination runs off the ladder", () => {
    expect(destinationIndex(palette, 7)).toBe(1);
    expect(destinationIndex(palette, -3)).toBe(0);
  });
});

describe("addSpectrum", () => {
  const two = addSpectrum(palette, "brand");

  it("appends the new Spectrum after the ones already there", () => {
    expect(two.spectrums).toHaveLength(2);
    expect(two.spectrums[0]).toEqual(brand);
    expect(two.spectrums[1].id).toBe("s2");
  });

  it("copies the Spectrum it was added from at every Row", () => {
    expect(two.rows.map((row) => row.stops.s2)).toEqual([
      { chroma: 0.02, hue: 264 },
      { chroma: 0.2, hue: 264 },
    ]);
  });

  it("leaves the Stops it copied untouched", () => {
    expect(two.rows.map((row) => row.stops.brand)).toEqual(
      palette.rows.map((row) => row.stops.brand),
    );
  });

  it("copies whichever Spectrum it was told to, not the first", () => {
    const accented = renameSpectrum(two, "s2", "accent");
    const three = addSpectrum(setChroma(accented, 0, "s2", 0.3), "s2");
    expect(three.rows[0].stops.s3).toEqual({ chroma: 0.3, hue: 264 });
  });
});

describe("renameSpectrum", () => {
  const two = addSpectrum(palette, "brand");

  it("renames the Spectrum without touching a single Stop", () => {
    const renamed = renameSpectrum(two, "s2", "accent");
    expect(renamed.spectrums[1]).toEqual({ id: "s2", name: "accent" });
    expect(renamed.rows).toEqual(two.rows);
  });

  it("refuses a name that would not name a custom property", () => {
    expect(renameSpectrum(two, "s2", "warm grey")).toBe(two);
    expect(renameSpectrum(two, "s2", "")).toBe(two);
  });

  it("refuses a name another Spectrum already holds", () => {
    expect(renameSpectrum(two, "s2", "brand")).toBe(two);
  });
});

describe("removeSpectrum", () => {
  const two = addSpectrum(palette, "brand");

  it("drops the Spectrum and its Stop from every Row", () => {
    const left = removeSpectrum(two, 0);
    expect(left.spectrums.map((spectrum) => spectrum.id)).toEqual(["s2"]);
    expect(left.rows.map((row) => row.stops)).toEqual([
      { s2: { chroma: 0.02, hue: 264 } },
      { s2: { chroma: 0.2, hue: 264 } },
    ]);
  });

  it("refuses to remove the final Spectrum", () => {
    expect(canRemoveSpectrum(palette)).toBe(false);
    expect(removeSpectrum(palette, 0)).toBe(palette);
  });

  it("allows removal while more than one Spectrum remains", () => {
    expect(canRemoveSpectrum(two)).toBe(true);
  });
});
