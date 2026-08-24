import { describe, expect, it } from "vitest";
import { clampRgb, converter, oklch } from "culori";
import { isInSrgb, maxSrgbChroma, resolve } from "./color";
import { maxChroma } from "./gamut/max-chroma";
import type { Row, Spectrum } from "./palette";

const brand: Spectrum = { id: "brand", name: "brand" };

function row(lightness: number, chroma: number, hue: number): Row {
  return { lightness, stops: { brand: { chroma, hue } } };
}

describe("resolve", () => {
  // The CSS Color 4 sample conversions of the sRGB primaries. Hex output is
  // too coarse to tell the two matrix sets apart — see the provenance test
  // below — so these pin correctness, not provenance.
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

  it("reports no fallback for a color already inside the sRGB region", () => {
    const resolved = resolve(row(60, 0.1, 250), brand);
    expect(resolved.fellBack).toBe(false);
    expect(resolved.rendered).toEqual(resolved.authored);
  });
});

describe("Fallback", () => {
  const authoredChroma = 0.35;
  const outOfGamut = row(60, authoredChroma, 250);

  it("reports that a color outside the sRGB region fell back", () => {
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

describe("matrix provenance", () => {
  /**
   * Ottosson's original Oklab coefficients, as published in "A perceptual color
   * space for image processing" (2020). CSS Color 4 carries the same matrices
   * re-derived at higher precision; the two agree to roughly 1e-8, which 8-bit
   * hex rounding hides entirely.
   */
  function ottossonLinearSrgb(l: number, c: number, h: number) {
    const a = c * Math.cos((h * Math.PI) / 180);
    const b = c * Math.sin((h * Math.PI) / 180);
    const L = (l + 0.3963377774 * a + 0.2158037573 * b) ** 3;
    const M = (l - 0.1055613458 * a - 0.0638541728 * b) ** 3;
    const S = (l - 0.0894841775 * a - 1.291485548 * b) ** 3;
    return [
      4.0767416621 * L - 3.3077115913 * M + 0.2309699292 * S,
      -1.2684380046 * L + 2.6097574011 * M - 0.3413193965 * S,
      -0.0041960863 * L - 0.7034186147 * M + 1.707614701 * S,
    ];
  }

  const sample = { l: 0.6, c: 0.15, h: 250 };

  it("resolves through the CSS Color 4 matrices, not Ottosson's originals", () => {
    const culori = converter("lrgb")({ mode: "oklch", ...sample });
    const ottosson = ottossonLinearSrgb(sample.l, sample.c, sample.h);
    const channels = [culori.r, culori.g, culori.b];

    // Close enough to be the same matrices, distinct enough to tell which.
    channels.forEach((channel, i) => {
      expect(channel).toBeCloseTo(ottosson[i], 7);
      expect(channel).not.toBe(ottosson[i]);
    });
  });
});

describe("maxSrgbChroma", () => {
  /**
   * CSS Color 4 §7 states that sRGB blue is `oklch(0.452 0.313 264.1)`, so the
   * sRGB region's boundary at that Lightness and Hue is that Chroma: the
   * contour drawn inside the Cross-section has to pass through it.
   */
  it("puts the sRGB primaries on the boundary", () => {
    expect(maxSrgbChroma(45.2, 264.1)).toBeCloseTo(0.3133, 3);
    expect(maxSrgbChroma(62.8, 29.2)).toBeCloseTo(0.2576, 3);
    expect(maxSrgbChroma(86.64, 142.5)).toBeCloseTo(0.2948, 3);
  });

  it("is the greatest Chroma that still maps to a hex value", () => {
    const lightness = 60;
    const hue = 250;
    const chroma = maxSrgbChroma(lightness, hue);
    expect(isInSrgb({ lightness, chroma, hue })).toBe(true);
    expect(isInSrgb({ lightness, chroma: chroma + 0.002, hue })).toBe(false);
  });

  it("sits inside the Visible gamut at every Hue", () => {
    for (let hue = 0; hue < 360; hue += 1) {
      expect(maxSrgbChroma(50, hue)).toBeLessThan(maxChroma(50, hue));
    }
  });
});
