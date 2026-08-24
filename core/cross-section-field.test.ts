import { describe, expect, it } from "vitest";
import { converter, formatHex } from "culori";
import { CHROMA_MAX, fallbackFor, maxSrgbChroma } from "./color";
import { maxChroma } from "./gamut/max-chroma";
import { chromaAndHueAt, plot } from "./cross-section";
import { sliceField, srgbBytes } from "./cross-section-field";

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

describe("srgbBytes", () => {
  it("agrees with culori, the reference it stands in for", () => {
    for (const lightness of [0, 12.5, 37, 50, 62.8, 88, 100]) {
      for (const hue of [0, 29.23, 90, 137, 210, 264, 330]) {
        for (const chroma of [0, 0.02, 0.1, 0.18]) {
          expect([...srgbBytes({ lightness, chroma, hue })]).toEqual(
            reference(lightness, chroma, hue),
          );
        }
      }
    }
  });
});

describe("sliceField", () => {
  it("holds one RGBA pixel per point of the chart", () => {
    expect(sliceField(50, SIZE)).toHaveLength(SIZE * SIZE * 4);
  });

  it("paints each pixel as the color its own center stands for", () => {
    // Well inside the sRGB region at this Lightness, so nothing has fallen back
    // and the pixel is simply the color that is there.
    const { bytes, at } = pixelAt(sliceField(50, SIZE), 0.05, 137);
    expect(maxSrgbChroma(50, at.hue)).toBeGreaterThan(at.chroma);
    expect(bytes).toEqual([...reference(50, at.chroma, at.hue), 255]);
  });

  it("paints the neutral axis at the slice's Lightness", () => {
    // An odd side puts one pixel's center on the origin, where there is no
    // Chroma at all: the slice's own Lightness as a grey.
    const odd = 65;
    const middle = (odd - 1) / 2;
    const { bytes, at } = pixel(sliceField(50, odd), middle, middle, odd);
    expect(at.chroma).toBe(0);
    expect(bytes).toEqual([...reference(50, 0, 0), 255]);
  });

  it("paints outside the sRGB region by Chroma reduction, not RGB clipping", () => {
    // Pure red is oklch(62.8% 0.2577 29.23): past that Chroma the region ends,
    // and a point beyond it paints as its Fallback rather than as a clipped
    // color, which would have shifted the Hue.
    const field = sliceField(62.8, SIZE);
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
    const field = sliceField(lightness, SIZE);
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
    const field = sliceField(62.8, odd);
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
    const field = sliceField(50, SIZE);
    // The widest the gamut ever gets is ~0.41 Chroma, so the rim is beyond it
    // at every Hue.
    for (const hue of [0, 90, 137, 264]) {
      expect(pixelAt(field, CHROMA_MAX * 0.99, hue).bytes[3]).toBe(0);
    }
  });

  it("paints the Boundary itself, so the field reaches the shape's edge", () => {
    const field = sliceField(50, SIZE);
    for (const hue of [0, 90, 137, 264]) {
      expect(pixelAt(field, maxChroma(50, hue) * 0.9, hue).bytes[3]).toBeGreaterThan(0);
    }
  });

  it("empties as Lightness reaches black and white, where there is no Chroma", () => {
    for (const lightness of [0, 100]) {
      const field = sliceField(lightness, SIZE);
      for (const hue of [0, 90, 180, 270]) {
        expect(pixelAt(field, 0.2, hue).bytes[3]).toBe(0);
      }
    }
  });
});
