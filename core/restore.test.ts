import { describe, expect, it } from "vitest";
import { encodePalette } from "./palette-code";
import { pastedPalette, restoredPalette } from "./restore";
import type { Palette } from "./palette";

const starter: Palette = {
  prefix: "color",
  spectrums: [{ id: "brand", name: "brand" }],
  rows: [{ lightness: 95, stops: { brand: { chroma: 0.02, hue: 264 } } }],
};

const shared: Palette = {
  prefix: "shared",
  spectrums: [{ id: "warm", name: "warm-grey" }],
  rows: [{ lightness: 40, stops: { warm: { chroma: 0.18, hue: 120 } } }],
};

const stored: Palette = {
  prefix: "mine",
  spectrums: [{ id: "brand", name: "brand" }],
  rows: [{ lightness: 20, stops: { brand: { chroma: 0.1, hue: 30 } } }],
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
