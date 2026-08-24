import { describe, expect, it } from "vitest";
import { CHROMA_MAX, isInSrgb } from "./color";
import {
  hueWheel,
  plot,
  polar,
  radiusOf,
  srgbRegionOutline,
  toPath,
  visibleGamutOutline,
  wheelColor,
} from "./cross-section";

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

  it("measures angle as Hue, clockwise from straight up", () => {
    // SVG's y axis points down, so straight up is y = 0.
    expect(plot(CHROMA_MAX, 0, SIZE).x).toBeCloseTo(50, 10);
    expect(plot(CHROMA_MAX, 0, SIZE).y).toBeCloseTo(0, 10);
    expect(plot(CHROMA_MAX, 90, SIZE).x).toBeCloseTo(100, 10);
    expect(plot(CHROMA_MAX, 180, SIZE).y).toBeCloseTo(100, 10);
    expect(plot(CHROMA_MAX, 270, SIZE).x).toBeCloseTo(0, 10);
  });

  it("measures radius as Chroma on an axis fixed from 0 to the authoring ceiling", () => {
    expect(CHROMA_MAX).toBe(0.5);
    expect(plot(0.25, 0, SIZE).y).toBeCloseTo(25, 10);
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

describe("srgbRegionOutline", () => {
  it("traces one point per degree of Hue", () => {
    expect(srgbRegionOutline(50, SIZE)).toHaveLength(360);
  });

  it("sits inside the Visible gamut at every Hue", () => {
    const srgb = srgbRegionOutline(50, SIZE);
    const visible = visibleGamutOutline(50, SIZE);
    for (let hue = 0; hue < 360; hue++) {
      expect(radiusAt(srgb, hue)).toBeLessThan(radiusAt(visible, hue));
    }
  });

  it("reaches the sRGB primaries: pure red is on the contour at its own Lightness", () => {
    // oklch(62.8% 0.2577 29.23) is #ff0000, so the contour at that Lightness
    // and Hue is that Chroma — an independently known point on the boundary.
    const contour = radiusAt(srgbRegionOutline(62.8, SIZE), 29);
    expect(contour).toBeCloseTo((0.2577 / CHROMA_MAX) * (SIZE / 2), 0);
  });
});

describe("radiusOf", () => {
  it("puts zero Chroma on the neutral axis and the ceiling on the rim", () => {
    expect(radiusOf(0, SIZE)).toBe(0);
    expect(radiusOf(CHROMA_MAX, SIZE)).toBe(SIZE / 2);
  });

  it("agrees with the radius plot uses, so a ring meets its own Hue line", () => {
    const { x, y } = plot(0.3, 137, SIZE);
    expect(Math.hypot(x - SIZE / 2, y - SIZE / 2)).toBeCloseTo(
      radiusOf(0.3, SIZE),
      10,
    );
  });

  it("puts a ring outside the sRGB contour when the color falls outside sRGB", () => {
    // Pure red is oklch(62.8% 0.2577 29.23), the most Chroma sRGB holds near
    // that Hue, so 0.35 there is outside the region and must read as outside.
    const contour = radiusAt(srgbRegionOutline(62.8, SIZE), 29);
    expect(radiusOf(0.35, SIZE)).toBeGreaterThan(contour);
    expect(radiusOf(0.2, SIZE)).toBeLessThan(contour);
  });
});

describe("hueWheel", () => {
  it("covers the rim once per degree of Hue", () => {
    const wheel = hueWheel(SIZE);
    expect(wheel).toHaveLength(360);
    expect(wheel.map(({ hue }) => hue)).toEqual(
      Array.from({ length: 360 }, (_, hue) => hue),
    );
  });

  it("starts each arc at its own Hue on the rim", () => {
    const wheel = hueWheel(SIZE);
    // Hue 0 is straight up and 90 is to the right, on a rim of radius 50.
    expect(wheel[0].path).toMatch(/^M50 0 A50/);
    expect(wheel[90].path).toMatch(/^M100 50 A50/);
  });

  it("sweeps the way Hue runs, so the arcs go clockwise round the rim", () => {
    // The sweep flag is the last of the arc's flags: 1 is clockwise on screen.
    expect(hueWheel(SIZE)[0].path).toContain("A50 50 0 0 1");
  });
});

describe("polar", () => {
  it("measures the same angles as plot, from the same origin", () => {
    expect(polar(0, 137, SIZE)).toEqual({ x: 50, y: 50 });
    expect(polar(50, 0, SIZE)).toEqual({ x: 50, y: 0 });
  });

  it("places furniture outside the chart, where a Chroma cannot reach", () => {
    // The rim is at radius 50, so 65 is outside it: room for a marker that
    // sits beyond the plotted area rather than over it.
    const { x, y } = polar(65, 90, SIZE);
    expect(x).toBeCloseTo(115, 10);
    expect(y).toBeCloseTo(50, 10);
  });
});

describe("wheelColor", () => {
  it("stays inside sRGB, so no browser has to map it and shift the Hue", () => {
    // The bug this replaced: an out-of-gamut oklch() handed to the browser came
    // back magenta at 100% Lightness, where white is the only color there is.
    for (const lightness of [0, 25, 60, 95, 100]) {
      for (const hue of [0, 90, 180, 270]) {
        expect(isInSrgb(wheelColor(lightness, hue))).toBe(true);
      }
    }
  });

  it("takes all the Chroma sRGB holds there", () => {
    // oklch(62.8% 0.2577 29.23) is #ff0000: the Boundary at that Lightness and
    // Hue, so the rim should be painted at exactly that Chroma.
    expect(wheelColor(62.8, 29.23).chroma).toBeCloseTo(0.2577, 3);
  });

  it("keeps the Lightness and Hue it was asked for", () => {
    expect(wheelColor(42, 137)).toMatchObject({ lightness: 42, hue: 137 });
  });
});
