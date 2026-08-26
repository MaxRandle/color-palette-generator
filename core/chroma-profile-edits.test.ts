import { describe, expect, it } from "vitest";
import {
  addChromaProfile,
  canRemoveChromaProfile,
  removeChromaProfile,
  renameChromaProfile,
  setChroma,
  setSpectrumProfile,
} from "./edits";
import type { Palette } from "./palette";

const vibrant = { id: "p1", name: "vibrant" };
const neutral = { id: "p2", name: "neutral" };
const brand = { id: "brand", name: "brand", profileId: "p1" };
const gray = { id: "gray", name: "gray", profileId: "p2" };

const palette: Palette = {
  prefix: "color",
  profiles: [vibrant, neutral],
  spectrums: [brand, gray],
  rows: [
    { lightness: 95, chromas: { p1: 0.02, p2: 0 }, stops: { brand: { hue: 264 }, gray: { hue: 264 } } },
    { lightness: 60, chromas: { p1: 0.2, p2: 0 }, stops: { brand: { hue: 264 }, gray: { hue: 264 } } },
  ],
};

describe("setChroma", () => {
  it("sets the value on the profile, so every spectrum reading it moves", () => {
    const next = setChroma(palette, 1, "p1", 0.1);
    expect(next.rows[1].chromas).toEqual({ p1: 0.1, p2: 0 });
  });

  it("leaves the other profiles at that row alone", () => {
    expect(setChroma(palette, 1, "p2", 0.05).rows[1].chromas.p1).toBe(0.2);
  });

  it("permits Chroma beyond the sRGB region, up to 0.5", () => {
    expect(setChroma(palette, 0, "p1", 0.5).rows[0].chromas.p1).toBe(0.5);
  });

  it("holds the value inside the authoring range", () => {
    expect(setChroma(palette, 0, "p1", 9).rows[0].chromas.p1).toBe(0.5);
    expect(setChroma(palette, 0, "p1", -1).rows[0].chromas.p1).toBe(0);
  });
});

describe("setSpectrumProfile", () => {
  it("points the spectrum at another profile", () => {
    const next = setSpectrumProfile(palette, "brand", "p2");
    expect(next.spectrums[0].profileId).toBe("p2");
  });

  it("changes no authored value", () => {
    expect(setSpectrumProfile(palette, "brand", "p2").rows).toEqual(palette.rows);
  });

  it("ignores a profile the palette does not hold", () => {
    expect(setSpectrumProfile(palette, "brand", "nope")).toBe(palette);
  });
});

describe("addChromaProfile", () => {
  it("copies the profile the spectrum is reading, so nothing changes color", () => {
    const next = addChromaProfile(palette, "brand");
    const minted = next.profiles[next.profiles.length - 1];
    expect(next.rows.map((row) => row.chromas[minted.id])).toEqual([0.02, 0.2]);
  });

  it("points the spectrum at the new profile", () => {
    const next = addChromaProfile(palette, "brand");
    expect(next.spectrums[0].profileId).toBe(next.profiles[2].id);
  });

  it("leaves every other spectrum where it was", () => {
    expect(addChromaProfile(palette, "brand").spectrums[1]).toEqual(gray);
  });

  it("leaves the copied profile's own values untouched", () => {
    const next = addChromaProfile(palette, "brand");
    expect(next.rows.map((row) => row.chromas.p1)).toEqual([0.02, 0.2]);
  });
});

describe("renameChromaProfile", () => {
  it("renames without touching the id a spectrum points at", () => {
    const next = renameChromaProfile(palette, "p1", "Brand accents");
    expect(next.profiles[0]).toEqual({ id: "p1", name: "Brand accents" });
    expect(next.spectrums[0].profileId).toBe("p1");
  });

  it("ignores a name another profile already holds", () => {
    expect(renameChromaProfile(palette, "p1", "neutral")).toBe(palette);
  });
});

describe("canRemoveChromaProfile", () => {
  it("allows removing a profile only one spectrum reads", () => {
    expect(canRemoveChromaProfile(palette, "p1")).toBe(true);
  });

  it("refuses while more than one spectrum reads it", () => {
    const shared = setSpectrumProfile(palette, "gray", "p1");
    expect(canRemoveChromaProfile(shared, "p1")).toBe(false);
  });

  it("refuses the last profile, which every spectrum would need", () => {
    const lone: Palette = { ...palette, profiles: [vibrant], spectrums: [brand] };
    expect(canRemoveChromaProfile(lone, "p1")).toBe(false);
  });
});

describe("removeChromaProfile", () => {
  it("drops the profile and its chroma from every row", () => {
    const next = removeChromaProfile(palette, "p1");
    expect(next.profiles).toEqual([neutral]);
    expect(next.rows[0].chromas).toEqual({ p2: 0 });
  });

  it("moves the spectrum that was reading it onto the first profile left", () => {
    expect(removeChromaProfile(palette, "p1").spectrums[0].profileId).toBe("p2");
  });

  it("refuses while more than one spectrum reads it", () => {
    const shared = setSpectrumProfile(palette, "gray", "p1");
    expect(removeChromaProfile(shared, "p1")).toBe(shared);
  });
});
