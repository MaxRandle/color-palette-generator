import { describe, expect, it } from "vitest";
import { converter, formatHex } from "culori";
import { CHROMA_MAX, fallbackFor, maxChromaIn, maxSrgbChroma } from "./color";
import { maxChroma } from "./gamut/max-chroma";
import { chromaAndHueAt, plot } from "./cross-section";
import { gamutBytes, sliceField } from "./cross-section-field";

const SIZE = 64;

/** The bytes of one pixel, with the Chroma and Hue its center stands for. */
function pixel(field: Uint8ClampedArray, column: number, row: number, size: number) {
  const index = (row * size + column) * 4;
  return {
    bytes: [...field.slice(index, index + 4)],
    at: chromaAndHueAt(column + 0.5, row + 0.5, size),
  };
}

/** The pixel a Chroma and Hue is plotted in. */
function pixelAt(
  field: Uint8ClampedArray,
  chroma: number,
  hue: number,
  size = SIZE,
) {
  const { x, y } = plot(chroma, hue, size);
  return pixel(field, Math.floor(x), Math.floor(y), size);
}

/** How far apart two Hues are, the short way round the turn. */
function turnsApart(one: number, other: number): number {
  const apart = Math.abs(one - other) % 360;
  return Math.min(apart, 360 - apart);
}

/** culori's own answer, as the bytes a pixel should hold. */
function reference(lightness: number, chroma: number, hue: number) {
  const hex = formatHex({ mode: "oklch", l: lightness / 100, c: chroma, h: hue });
  const [, r, g, b] = /^#(..)(..)(..)$/.exec(hex)!;
  return [r, g, b].map((byte) => parseInt(byte, 16));
}

describe("gamutBytes", () => {
  it("agrees with culori in sRGB, the reference it stands in for", () => {
    for (const lightness of [0, 12.5, 37, 50, 62.8, 88, 100]) {
      for (const hue of [0, 29.23, 90, 137, 210, 264, 330]) {
        for (const chroma of [0, 0.02, 0.1, 0.18]) {
          expect([...gamutBytes({ lightness, chroma, hue }, "srgb")]).toEqual(
            reference(lightness, chroma, hue),
          );
        }
      }
    }
  });

  it("agrees with culori in Display P3 too, so the second matrix cannot drift", () => {
    const toP3 = converter("p3");
    for (const lightness of [0, 12.5, 37, 50, 62.8, 88, 100]) {
      for (const hue of [0, 29.23, 90, 137, 210, 264, 330]) {
        for (const chroma of [0, 0.02, 0.1, 0.18]) {
          const { r, g, b } = toP3({ mode: "oklch", l: lightness / 100, c: chroma, h: hue });
          expect([...gamutBytes({ lightness, chroma, hue }, "display-p3")]).toEqual(
            [r, g, b].map((channel) =>
              Math.max(0, Math.min(255, Math.round(channel * 255))),
            ),
          );
        }
      }
    }
  });

  it("says the same thing in both gamuts for a grey, which has no Chroma to place", () => {
    for (const lightness of [0, 25, 50, 75, 100]) {
      const color = { lightness, chroma: 0, hue: 0 };
      expect([...gamutBytes(color, "display-p3")]).toEqual([
        ...gamutBytes(color, "srgb"),
      ]);
    }
  });
});

describe("sliceField", () => {
  it("holds one RGBA pixel per point of the chart", () => {
    expect(sliceField(50, SIZE, "srgb")).toHaveLength(SIZE * SIZE * 4);
  });

  it("paints each pixel as the color its own center stands for", () => {
    // Well inside the sRGB region at this Lightness, so nothing has fallen back
    // and the pixel is simply the color that is there.
    const { bytes, at } = pixelAt(sliceField(50, SIZE, "srgb"), 0.05, 137);
    expect(maxSrgbChroma(50, at.hue)).toBeGreaterThan(at.chroma);
    expect(bytes).toEqual([...reference(50, at.chroma, at.hue), 255]);
  });

  it("paints the neutral axis at the slice's Lightness", () => {
    // An odd side puts one pixel's center on the origin, where there is no
    // Chroma at all: the slice's own Lightness as a grey.
    const odd = 65;
    const middle = (odd - 1) / 2;
    const { bytes, at } = pixel(sliceField(50, odd, "srgb"), middle, middle, odd);
    expect(at.chroma).toBe(0);
    expect(bytes).toEqual([...reference(50, 0, 0), 255]);
  });

  it("paints outside the sRGB region by Chroma reduction, not RGB clipping", () => {
    // Pure red is oklch(62.8% 0.2577 29.23): past that Chroma the region ends,
    // and a point beyond it paints as its Fallback rather than as a clipped
    // color, which would have shifted the Hue.
    const field = sliceField(62.8, SIZE, "srgb");
    const edge = maxSrgbChroma(62.8, 29.23);
    const { bytes, at } = pixelAt(field, (edge + maxChroma(62.8, 29.23)) / 2, 29.23);
    expect(at.chroma).toBeGreaterThan(maxSrgbChroma(62.8, at.hue));
    const fallback = fallbackFor({ lightness: 62.8, ...at });
    expect(bytes).toEqual([
      ...reference(62.8, fallback.chroma, fallback.hue),
      255,
    ]);
  });

  it("holds the Hue it was asked for, all the way round the turn", () => {
    // The property RGB clipping would destroy: clipping moves the channels
    // one by one and lands the pixel on a different Hue, which would make the
    // angular axis lie. Chroma reduction cannot, so every painted pixel reads
    // back at the Hue it stands for — sampled here outside the sRGB region,
    // where the Fallback is doing the work.
    const lightness = 62.8;
    const field = sliceField(lightness, SIZE, "srgb");
    const toOklch = converter("oklch");
    for (let hue = 0; hue < 360; hue += 3) {
      const edge = maxSrgbChroma(lightness, hue);
      const outer = maxChroma(lightness, hue);
      if (outer <= edge) continue;
      const { bytes, at } = pixelAt(field, (edge + outer) / 2, hue);
      // Skip the feathered pixels on the Visible gamut's edge, which are part
      // transparent and so part background.
      if (bytes[3] !== 255) continue;
      const [red, green, blue] = bytes;
      const painted = toOklch({ mode: "rgb", r: red / 255, g: green / 255, b: blue / 255 });
      // Two degrees of slack for 8-bit rounding; a clipped pixel would be off
      // by tens.
      expect(turnsApart(painted.h ?? 0, at.hue)).toBeLessThan(2);
    }
  });

  it("goes radially flat outside the sRGB region, so the flatness marks the Boundary", () => {
    // An odd side puts a column of pixel centers straight up the Hue 0 ray, so
    // two of them differ in Chroma alone.
    const odd = 65;
    const field = sliceField(62.8, odd, "srgb");
    const column = (odd - 1) / 2;
    const rowFor = (chroma: number) => Math.floor(plot(chroma, 0, odd).y);
    const edge = maxSrgbChroma(62.8, 0);
    const outer = maxChroma(62.8, 0);
    const nearer = pixel(field, column, rowFor(edge + (outer - edge) * 0.4), odd);
    const further = pixel(field, column, rowFor(edge + (outer - edge) * 0.8), odd);
    expect(nearer.at.hue).toBe(further.at.hue);
    expect(nearer.at.chroma).not.toBeCloseTo(further.at.chroma, 3);
    expect(nearer.bytes).toEqual(further.bytes);
  });

  it("paints nothing outside the Visible gamut: the shape is the specification", () => {
    const field = sliceField(50, SIZE, "srgb");
    // The widest the gamut ever gets is ~0.41 Chroma, so the rim is beyond it
    // at every Hue.
    for (const hue of [0, 90, 137, 264]) {
      expect(pixelAt(field, CHROMA_MAX * 0.99, hue).bytes[3]).toBe(0);
    }
  });

  it("paints the Boundary itself, so the field reaches the shape's edge", () => {
    const field = sliceField(50, SIZE, "srgb");
    for (const hue of [0, 90, 137, 264]) {
      expect(pixelAt(field, maxChroma(50, hue) * 0.9, hue).bytes[3]).toBeGreaterThan(0);
    }
  });

  it("empties as Lightness reaches black and white, where there is no Chroma", () => {
    for (const lightness of [0, 100]) {
      const field = sliceField(lightness, SIZE, "srgb");
      for (const hue of [0, 90, 180, 270]) {
        expect(pixelAt(field, 0.2, hue).bytes[3]).toBe(0);
      }
    }
  });
});

/** culori's own answer in Display P3, as the bytes a pixel should hold. */
function p3Reference(lightness: number, chroma: number, hue: number) {
  const { r, g, b } = converter("p3")({
    mode: "oklch",
    l: lightness / 100,
    c: chroma,
    h: hue,
  });
  return [r, g, b].map((channel) =>
    Math.max(0, Math.min(255, Math.round(channel * 255))),
  );
}

describe("sliceField on a wide-gamut screen", () => {
  const LIGHTNESS = 62.8;

  it("paints past the sRGB region, where an sRGB screen had already flattened", () => {
    // Between the two Boundaries at pure red's Hue: sRGB has nothing left to
    // give here and paints its own edge, P3 paints the color that is there.
    const hue = 29.23;
    const inside = maxSrgbChroma(LIGHTNESS, hue);
    const outside = maxChromaIn(LIGHTNESS, hue, "display-p3");
    expect(outside).toBeGreaterThan(inside);

    // A quarter of the way out rather than half: at this Lightness the Visible
    // gamut is barely wider than P3 here, and the last pixel before its edge is
    // feathered, which would be a test of the alpha rather than of the color.
    const between = inside + (outside - inside) * 0.25;
    const { bytes, at } = pixelAt(sliceField(LIGHTNESS, SIZE, "display-p3"), between, hue);
    expect(at.chroma).toBeGreaterThan(maxSrgbChroma(LIGHTNESS, at.hue));
    expect(bytes).toEqual([...p3Reference(LIGHTNESS, at.chroma, at.hue), 255]);
    expect(bytes).not.toEqual(
      pixelAt(sliceField(LIGHTNESS, SIZE, "srgb"), between, hue).bytes,
    );
  });

  it("holds the Hue it was asked for out at its own Boundary", () => {
    // The same property the sRGB field is held to, now that the pulling back is
    // being done to a different Boundary: still Chroma reduction, still never
    // clipping, so the angular axis stays true wherever the field ends.
    const field = sliceField(LIGHTNESS, SIZE, "display-p3");
    const toOklch = converter("oklch");
    for (let hue = 0; hue < 360; hue += 3) {
      const edge = maxChromaIn(LIGHTNESS, hue, "display-p3");
      const outer = maxChroma(LIGHTNESS, hue);
      if (outer <= edge) continue;
      const { bytes, at } = pixelAt(field, (edge + outer) / 2, hue);
      if (bytes[3] !== 255) continue;
      const [red, green, blue] = bytes;
      const painted = toOklch({ mode: "p3", r: red / 255, g: green / 255, b: blue / 255 });
      expect(turnsApart(painted.h ?? 0, at.hue)).toBeLessThan(2);
    }
  });

  it("is the same field in the neutral middle, where there is no Chroma to differ over", () => {
    const odd = 65;
    const middle = (odd - 1) / 2;
    expect(pixel(sliceField(50, odd, "display-p3"), middle, middle, odd).bytes).toEqual(
      pixel(sliceField(50, odd, "srgb"), middle, middle, odd).bytes,
    );
  });

  it("ends on the same shape: the Visible gamut, not the screen", () => {
    const field = sliceField(50, SIZE, "display-p3");
    for (const hue of [0, 90, 137, 264]) {
      expect(pixelAt(field, CHROMA_MAX * 0.99, hue).bytes[3]).toBe(0);
      expect(pixelAt(field, maxChroma(50, hue) * 0.9, hue).bytes[3]).toBeGreaterThan(0);
    }
  });
});
