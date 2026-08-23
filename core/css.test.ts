import { describe, expect, it } from "vitest";
import { formatCss } from "./css";
import type { Palette, Row } from "./palette";

const brand = { id: "brand", name: "brand" };
const accent = { id: "accent", name: "accent" };

function row(lightness: number, chroma: number, hue: number): Row {
  return { lightness, stops: { brand: { chroma, hue }, accent: { chroma, hue } } };
}

const palette: Palette = {
  prefix: "color",
  spectrums: [brand],
  rows: [row(100, 0, 0), row(62.796, 0.25768, 29.234), row(0, 0, 0)],
};

describe("formatCss", () => {
  it("emits one custom property per Socket, in hex, named from the prefix and Socket number", () => {
    expect(formatCss(palette)).toBe(
      [
        "--color-100: #ffffff;",
        "--color-200: #ff0000;",
        "--color-300: #000000;",
      ].join("\n"),
    );
  });

  it("follows the palette's prefix", () => {
    expect(formatCss({ ...palette, prefix: "brand" })).toContain("--brand-100:");
  });

  it("names the Spectrum too once a palette has more than one", () => {
    const lines = formatCss({ ...palette, spectrums: [brand, accent] }).split("\n");
    expect(lines).toHaveLength(6);
    expect(lines[0]).toBe("--color-brand-100: #ffffff;");
    expect(lines[3]).toBe("--color-accent-100: #ffffff;");
  });

  it("marks lines whose color fell back with a trailing comment", () => {
    const withFallback: Palette = {
      ...palette,
      rows: [row(100, 0, 0), row(60, 0.35, 250)],
    };
    const lines = formatCss(withFallback).split("\n");
    expect(lines[0]).toBe("--color-100: #ffffff;");
    expect(lines[1]).toMatch(
      /^--color-200: #[0-9a-f]{6}; \/\* fallback: chroma 0\.35 reduced to 0\.\d+ \*\/$/,
    );
  });
});
