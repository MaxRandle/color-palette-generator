import { describe, expect, it } from "vitest";
import { CHROMA_MAX } from "./color";
import { plot, toPath, visibleGamutOutline } from "./cross-section";

const SIZE = 100;

/** The radius, in chart units, of a point on an outline. */
function radiusAt(outline: readonly { x: number; y: number }[], hue: number) {
  const { x, y } = outline[hue];
  return Math.hypot(x - SIZE / 2, y - SIZE / 2);
}

describe("plot", () => {
  it("puts the neutral axis at the center", () => {
    expect(plot(0, 0, SIZE)).toEqual({ x: 50, y: 50 });
    expect(plot(0, 137, SIZE)).toEqual({ x: 50, y: 50 });
  });

  it("measures angle as Hue, counter-clockwise from the right", () => {
    expect(plot(CHROMA_MAX, 0, SIZE).x).toBeCloseTo(100, 10);
    expect(plot(CHROMA_MAX, 0, SIZE).y).toBeCloseTo(50, 10);
    // SVG's y axis points down, so 90 degrees of Hue is up the screen.
    expect(plot(CHROMA_MAX, 90, SIZE).y).toBeCloseTo(0, 10);
    expect(plot(CHROMA_MAX, 180, SIZE).x).toBeCloseTo(0, 10);
  });

  it("measures radius as Chroma on an axis fixed from 0 to the authoring ceiling", () => {
    expect(CHROMA_MAX).toBe(0.5);
    expect(plot(0.25, 0, SIZE).x).toBeCloseTo(75, 10);
  });
});

describe("visibleGamutOutline", () => {
  it("traces one point per degree of Hue", () => {
    expect(visibleGamutOutline(50, SIZE)).toHaveLength(360);
  });

  it("does not rescale with Lightness: the axis is the axis", () => {
    // The widest the gamut ever gets is ~0.41 Chroma, so no outline should
    // reach the rim, and the narrow ones should be small rather than normalised
    // back up to it.
    const rim = SIZE / 2;
    const widest = Math.max(
      ...visibleGamutOutline(55, SIZE).map((_, hue) =>
        radiusAt(visibleGamutOutline(55, SIZE), hue),
      ),
    );
    expect(widest).toBeCloseTo((0.41 / CHROMA_MAX) * rim, 0);
    expect(widest).toBeLessThan(rim);
  });

  it("changes shape with Lightness", () => {
    // Yellow runs out of room at low Lightness; blue at high. The two outlines
    // are not the same shape, let alone the same size.
    const dark = visibleGamutOutline(30, SIZE);
    const light = visibleGamutOutline(90, SIZE);
    expect(radiusAt(dark, 90) / radiusAt(light, 90)).toBeLessThan(0.5);
    expect(radiusAt(dark, 264) / radiusAt(light, 264)).toBeGreaterThan(1.5);
  });

  it("collapses towards the center near black and near white", () => {
    for (const lightness of [0, 0.5, 99.5, 100]) {
      const outline = visibleGamutOutline(lightness, SIZE);
      const widest = Math.max(
        ...outline.map((_, hue) => radiusAt(outline, hue)),
      );
      expect(widest).toBeLessThan(SIZE / 2 / 5);
    }
  });
});

describe("toPath", () => {
  it("closes the outline", () => {
    const path = toPath([
      { x: 1, y: 2 },
      { x: 3, y: 4 },
    ]);
    expect(path).toBe("M1.000 2.000 L3.000 4.000 Z");
  });
});
