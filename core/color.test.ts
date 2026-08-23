import { describe, expect, it } from "vitest";
import { clampRgb, converter, oklch } from "culori";
import { isInSrgb, resolve } from "./color";
import type { Row, Spectrum } from "./palette";

const brand: Spectrum = { id: "brand", name: "brand" };

function row(lightness: number, chroma: number, hue: number): Row {
  return { lightness, stops: { brand: { chroma, hue } } };
}

describe("resolve", () => {
  // Expected values are the CSS Color 4 sample conversions of the sRGB
  // primaries, which the CSS Color 4 matrices reproduce and Ottosson's
  // originals do not to this precision.
  it.each([
    ["white", row(100, 0, 0), "#ffffff"],
    ["black", row(0, 0, 0), "#000000"],
    ["red", row(62.796, 0.25768, 29.234), "#ff0000"],
    ["green", row(86.644, 0.29483, 142.495), "#00ff00"],
    ["blue", row(45.201, 0.31321, 264.052), "#0000ff"],
  ])("converts in-gamut %s to hex", (_name, input, hex) => {
    expect(resolve(input, brand).hex).toBe(hex);
  });

  it("takes Lightness from the Row and Chroma and Hue from the Spectrum's Stop", () => {
    expect(resolve(row(60, 0.1, 250), brand).authored).toEqual({
      lightness: 60,
      chroma: 0.1,
      hue: 250,
    });
  });

  it("reports no fallback for a colour already inside the sRGB region", () => {
    const resolved = resolve(row(60, 0.1, 250), brand);
    expect(resolved.fellBack).toBe(false);
    expect(resolved.rendered).toEqual(resolved.authored);
  });
});

describe("Fallback", () => {
  const authoredChroma = 0.35;
  const outOfGamut = row(60, authoredChroma, 250);

  it("reports that a colour outside the sRGB region fell back", () => {
    expect(resolve(outOfGamut, brand).fellBack).toBe(true);
  });

  it("holds Lightness and Hue and reduces only Chroma", () => {
    const { authored, rendered } = resolve(outOfGamut, brand);
    expect(rendered.lightness).toBe(authored.lightness);
    expect(rendered.hue).toBe(authored.hue);
    expect(rendered.chroma).toBeLessThan(authored.chroma);
  });

  it("never overwrites the authored values", () => {
    const { authored } = resolve(outOfGamut, brand);
    expect(authored).toEqual({ lightness: 60, chroma: authoredChroma, hue: 250 });
  });

  it("lands inside the sRGB region, keeping as much Chroma as it can", () => {
    const { rendered } = resolve(outOfGamut, brand);
    expect(isInSrgb(rendered)).toBe(true);
    expect(isInSrgb({ ...rendered, chroma: rendered.chroma + 0.005 })).toBe(false);
  });

  it("does not shift Hue the way RGB clipping would", () => {
    const { rendered } = resolve(outOfGamut, brand);
    const clipped = converter("oklch")(clampRgb(oklch({ mode: "oklch", l: 0.6, c: 0.35, h: 250 })));
    expect(clipped.h).not.toBeCloseTo(250, 1);
    expect(rendered.hue).toBeCloseTo(250, 10);
  });
});
