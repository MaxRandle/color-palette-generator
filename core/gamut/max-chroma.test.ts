import { describe, expect, it } from "vitest";
import { converter } from "culori";
import { maxChroma } from "./max-chroma";
import { WYSZECKI_STILES_OPTIMAL_STIMULI_D65 } from "./data/wyszecki-stiles-optimal-stimuli";

const toOklch = converter("oklch");

/** The greatest Chroma the Visible gamut allows anywhere at this Lightness. */
function widest(lightness: number): { chroma: number; hue: number } {
  let widestSoFar = { chroma: 0, hue: 0 };
  for (let hue = 0; hue < 360; hue += 1) {
    const chroma = maxChroma(lightness, hue);
    if (chroma > widestSoFar.chroma) widestSoFar = { chroma, hue };
  }
  return widestSoFar;
}

describe("maxChroma", () => {
  it("is exactly zero at both ends of the Lightness range", () => {
    for (let hue = 0; hue < 360; hue += 1) {
      expect(maxChroma(0, hue)).toBe(0);
      expect(maxChroma(100, hue)).toBe(0);
    }
  });

  it("is positive everywhere between them", () => {
    for (let lightness = 0.5; lightness < 100; lightness += 0.5) {
      for (let hue = 0; hue < 360; hue += 1) {
        expect(maxChroma(lightness, hue)).toBeGreaterThan(0);
      }
    }
  });

  /**
   * The shape of the optimal color solid, from the throwaway Python prototype
   * in `docs/research/human-gamut-boundary.md` §4. That prototype binned its
   * samples to the nearest 0.1% of Lightness, which reads high wherever the
   * boundary is steep — most of all near white, where Chroma moves by ~0.006
   * per 0.05% of Lightness — so its figures are matched here to 0.007.
   */
  it.each([
    [5, 0.0637],
    [10, 0.1263],
    [20, 0.2454],
    [30, 0.337],
    [40, 0.3809],
    [50, 0.4063],
    [60, 0.4051],
    [70, 0.3855],
    [80, 0.3669],
    [90, 0.3008],
    [95, 0.2551],
    [99, 0.1294],
    [99.5, 0.0679],
  ])("matches the researched boundary at %s%% Lightness", (lightness, chroma) => {
    expect(Math.abs(widest(lightness).chroma - chroma)).toBeLessThan(0.007);
  });

  it("peaks around 0.41 in the purples, a little above half Lightness", () => {
    let peak = { chroma: 0, hue: 0, lightness: 0 };
    for (let lightness = 0; lightness <= 100; lightness += 0.5) {
      const here = widest(lightness);
      if (here.chroma > peak.chroma) peak = { ...here, lightness };
    }
    expect(peak.chroma).toBeCloseTo(0.41, 2);
    expect(peak.lightness).toBeGreaterThan(50);
    expect(peak.lightness).toBeLessThan(60);
    expect(peak.hue).toBeGreaterThan(300);
    expect(peak.hue).toBeLessThan(340);
  });

  /**
   * Near black the solid approaches the spectral cone, whose maximum Chroma per
   * Lightness is ~1.264 — a hard ceiling, since every object color is a light
   * the cone contains. The research note quotes ~1.31 from its 0.1%-binned
   * samples; that bias is the difference, and a slope genuinely above the cone's
   * would mean the pipeline was wrong.
   */
  it("runs almost straight out of black at about 1.26 Chroma per Lightness", () => {
    for (const lightness of [0.5, 1, 1.5, 2]) {
      // Chroma per unit Lightness, with Lightness as the 0-to-1 fraction the
      // relation is quoted in rather than a percentage.
      const slope = widest(lightness).chroma / (lightness / 100);
      expect(slope).toBeGreaterThan(1.2);
      // The cone's ceiling, plus a unit of the table's quantisation, which is
      // worth 0.002 of slope this close to black.
      expect(slope).toBeLessThan(1.267);
    }
  });

  it("collapses towards zero at both ends", () => {
    expect(widest(0.5).chroma).toBeLessThan(0.01);
    expect(widest(99.9).chroma).toBeLessThan(0.03);
  });
});

/**
 * The independent check on the whole pipeline: Wyszecki & Stiles' optimal color
 * stimuli under D65, tabulated in xyY, computed by nobody here. Every one of
 * them is a point *on* the boundary, so the generated boundary has to reach
 * each of them and not overshoot.
 */
describe("against Wyszecki & Stiles' optimal color stimuli", () => {
  const stimuli = WYSZECKI_STILES_OPTIMAL_STIMULI_D65.map(([x, y, luminance]) => {
    const relativeY = luminance / 100;
    const { l, c, h } = toOklch({
      mode: "xyz65",
      x: (x * relativeY) / y,
      y: relativeY,
      z: ((1 - x - y) * relativeY) / y,
    });
    return { lightness: l * 100, chroma: c, hue: h ?? 0 };
  });

  it("covers 240 tabulated stimuli", () => {
    expect(stimuli).toHaveLength(240);
  });

  it.each(stimuli)(
    "reaches the stimulus at L $lightness, hue $hue",
    ({ lightness, chroma, hue }) => {
      // The table is quoted to four decimals in xy, which is worth a few
      // thousandths of Chroma on its own.
      expect(maxChroma(lightness, hue)).toBeCloseTo(chroma, 2);
    },
  );
});
