import { describe, expect, it } from "vitest";
import { encodePalette } from "./palette-code";
import { pastedPalette, restoredPalette } from "./restore";
import type { Palette } from "./palette";

const vibrant = { id: "p1", name: "vibrant" };

const starter: Palette = {
  prefix: "color",
  profiles: [vibrant],
  spectrums: [{ id: "brand", name: "brand", profileId: "p1" }],
  rows: [{ lightness: 95, chromas: { p1: 0.02 }, stops: { brand: { hue: 264 } } }],
};

const shared: Palette = {
  prefix: "shared",
  profiles: [vibrant],
  spectrums: [{ id: "warm", name: "warm-grey", profileId: "p1" }],
  rows: [{ lightness: 40, chromas: { p1: 0.18 }, stops: { warm: { hue: 120 } } }],
};

const stored: Palette = {
  prefix: "mine",
  profiles: [vibrant],
  spectrums: [{ id: "brand", name: "brand", profileId: "p1" }],
  rows: [{ lightness: 20, chromas: { p1: 0.1 }, stops: { brand: { hue: 30 } } }],
};

describe("restoredPalette", () => {
  it("opens the Palette the fragment carries, exactly as encoded", () => {
    expect(restoredPalette(encodePalette(shared), null, starter)).toEqual(shared);
  });

  it("lets the fragment win over the last visit", () => {
    const restored = restoredPalette(
      encodePalette(shared),
      encodePalette(stored),
      starter,
    );
    expect(restored).toEqual(shared);
  });

  it("restores the last visit when the address bar carries nothing", () => {
    expect(restoredPalette(null, encodePalette(stored), starter)).toEqual(stored);
  });

  it("opens the starter Palette when neither has anything to say", () => {
    expect(restoredPalette(null, null, starter)).toBe(starter);
  });

  it("opens the starter Palette rather than the last visit on an unreadable code", () => {
    expect(restoredPalette("2~from~the:future~50,0.1,10", encodePalette(stored), starter)).toBe(
      starter,
    );
  });

  it("falls past an unreadable last visit to the starter Palette", () => {
    expect(restoredPalette(null, "nonsense", starter)).toBe(starter);
  });
});

describe("pastedPalette", () => {
  it("opens the Palette a newly pasted fragment carries", () => {
    expect(pastedPalette(encodePalette(shared), stored)).toEqual(shared);
  });

  it("keeps the work in hand when the fragment says nothing readable", () => {
    expect(pastedPalette("2~from~the:future~50,0.1,10", stored)).toBe(stored);
    expect(pastedPalette(null, stored)).toBe(stored);
  });
});
