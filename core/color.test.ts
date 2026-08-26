import { describe, expect, it } from "vitest";
import { clampRgb, converter, oklch } from "culori";
import {
  CHROMA_MAX,
  fallbackFor,
  isInGamut,
  isInSrgb,
  maxChromaIn,
  maxSrgbChroma,
  pulledInto,
  resolve,
} from "./color";
import { maxChroma } from "./gamut/max-chroma";
import type { Palette, Row, Spectrum } from "./palette";

const brand: Spectrum = { id: "brand", name: "brand", profileId: "p1" };

/** A one-Spectrum Palette, which is all `resolve` reads a Palette for. */
const palette: Palette = {
  prefix: "color",
  profiles: [{ id: "p1", name: "vibrant" }],
  spectrums: [brand],
  rows: [],
};

function row(lightness: number, chroma: number, hue: number): Row {
  return { lightness, chromas: { p1: chroma }, stops: { brand: { hue } } };
}

/** `resolve` against that Palette, which every case here shares. */
function resolved(row: Row) {
  return resolve(palette, row, brand);
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
    expect(resolved(input).hex).toBe(hex);
  });

  it("takes Lightness from the Row and Chroma and Hue from the Spectrum's Stop", () => {
    expect(resolved(row(60, 0.1, 250)).authored).toEqual({
      lightness: 60,
      chroma: 0.1,
      hue: 250,
    });
  });

  it("reports no fallback for a color already inside the sRGB region", () => {
    const inside = resolved(row(60, 0.1, 250));
    expect(inside.fellBack).toBe(false);
    expect(inside.rendered).toEqual(inside.authored);
  });
});

describe("Fallback", () => {
  const authoredChroma = 0.35;
  const outOfGamut = row(60, authoredChroma, 250);

  it("reports that a color outside the sRGB region fell back", () => {
    expect(resolved(outOfGamut).fellBack).toBe(true);
  });

  it("holds Lightness and Hue and reduces only Chroma", () => {
    const { authored, rendered } = resolved(outOfGamut);
    expect(rendered.lightness).toBe(authored.lightness);
    expect(rendered.hue).toBe(authored.hue);
    expect(rendered.chroma).toBeLessThan(authored.chroma);
  });

  it("never overwrites the authored values", () => {
    const { authored } = resolved(outOfGamut);
    expect(authored).toEqual({ lightness: 60, chroma: authoredChroma, hue: 250 });
  });

  it("lands inside the sRGB region, keeping as much Chroma as it can", () => {
    const { rendered } = resolved(outOfGamut);
    expect(isInSrgb(rendered)).toBe(true);
    expect(isInSrgb({ ...rendered, chroma: rendered.chroma + 0.005 })).toBe(false);
  });

  it("does not shift Hue the way RGB clipping would", () => {
    const { rendered } = resolved(outOfGamut);
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

describe("fallbackFor", () => {
  it("leaves a color the sRGB region already holds alone", () => {
    const inside = { lightness: 60, chroma: 0.1, hue: 264 };
    expect(fallbackFor(inside)).toEqual(inside);
  });

  // White and black are the only colors at the ends of the Lightness axis, so
  // any Chroma asked for there falls back to no color at all. What survives the
  // Fallback is not always a Chroma of zero — near black, Oklab's cube brings a
  // sizable Chroma inside the half a hex step `isInSrgb` tolerates — so this
  // asks what the color renders as, which is the part anyone can see.
  it.each([
    ["white", row(100, CHROMA_MAX, 90), 255],
    ["black", row(0, CHROMA_MAX, 270), 0],
  ])("falls back to %s at the end of the axis", (_name, input, level) => {
    const hex = resolved(input).hex;
    const channels = [1, 3, 5].map((at) => parseInt(hex.slice(at, at + 2), 16));
    // Within a few steps of #ffffff and #000000 rather than exactly them:
    // `isInSrgb` tolerates half a hex step, and near black Oklab's cube hides a
    // sizable Chroma inside that tolerance. Below what an eye can register.
    for (const channel of channels) {
      expect(Math.abs(channel - level)).toBeLessThanOrEqual(3);
    }
  });

  it("keeps the Lightness and Hue it was given", () => {
    const { lightness, hue } = fallbackFor({
      lightness: 25,
      chroma: 0.5,
      hue: 137,
    });
    expect({ lightness, hue }).toEqual({ lightness: 25, hue: 137 });
  });
});

describe("the Display P3 gamut", () => {
  it("holds more Chroma than sRGB at every Hue", () => {
    for (let hue = 0; hue < 360; hue += 5) {
      expect(maxChromaIn(65, hue, "display-p3")).toBeGreaterThan(
        maxSrgbChroma(65, hue),
      );
    }
  });

  it("takes in colors sRGB has to turn away", () => {
    const vivid = { lightness: 65, chroma: 0.28, hue: 29 };
    expect(isInSrgb(vivid)).toBe(false);
    expect(isInGamut(vivid, "display-p3")).toBe(true);
  });

  it("leaves a color it already holds exactly where it was authored", () => {
    const vivid = { lightness: 65, chroma: 0.28, hue: 29 };
    expect(pulledInto(vivid, "display-p3")).toEqual(vivid);
    expect(pulledInto(vivid, "srgb")).toEqual(fallbackFor(vivid));
  });

  it("pulls Chroma alone, so a color keeps the Hue it was authored at", () => {
    const { lightness, chroma, hue } = pulledInto(
      { lightness: 50, chroma: CHROMA_MAX, hue: 264.1 },
      "display-p3",
    );
    expect(lightness).toBe(50);
    expect(hue).toBe(264.1);
    expect(chroma).toBeCloseTo(maxChromaIn(50, 264.1, "display-p3"), 10);
  });
});
