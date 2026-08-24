/**
 * The geometry of the Cross-section: a horizontal slice through the Oklch color
 * space at one Lightness, in polar coordinates with angle as Hue and radius as
 * Chroma.
 */

import { CHROMA_MAX, maxSrgbChroma } from "./color";
import { maxChroma } from "./gamut/max-chroma";

export type Point = { readonly x: number; readonly y: number };

const DEGREES = Math.PI / 180;

/**
 * One Chroma as a distance from the origin in a square chart of this side. The
 * radial axis is the authoring ceiling at every Lightness, so a slice never
 * rescales: the shape shrinking towards white is the shape shrinking, not the
 * chart zooming.
 */
export function radiusOf(chroma: number, size: number): number {
  return (chroma / CHROMA_MAX) * (size / 2);
}

/**
 * One Chroma and Hue as a point in a square chart of this side, with the
 * neutral axis at the center. Hue runs counter-clockwise from the right, so it
 * reads the way the color wheel does rather than the way SVG's y axis points.
 */
export function plot(chroma: number, hue: number, size: number): Point {
  const center = size / 2;
  const radius = radiusOf(chroma, size);
  return {
    x: center + radius * Math.cos(hue * DEGREES),
    y: center - radius * Math.sin(hue * DEGREES),
  };
}

/** A Boundary sampled once per degree of Hue, as points in the chart. */
function outline(
  boundaryAt: (hue: number) => number,
  size: number,
): readonly Point[] {
  return Array.from({ length: 360 }, (_, hue) =>
    plot(boundaryAt(hue), hue, size),
  );
}

/** The Visible gamut's Boundary at one Lightness. */
export function visibleGamutOutline(
  lightness: number,
  size: number,
): readonly Point[] {
  return outline((hue) => maxChroma(lightness, hue), size);
}

/** Where the sRGB region ends at one Lightness. */
export function srgbRegionOutline(
  lightness: number,
  size: number,
): readonly Point[] {
  return outline((hue) => maxSrgbChroma(lightness, hue), size);
}

/** An outline as a closed SVG path. */
export function toPath(points: readonly Point[]): string {
  return `${points
    .map(({ x, y }, index) => `${index === 0 ? "M" : "L"}${x.toFixed(3)} ${y.toFixed(3)}`)
    .join(" ")} Z`;
}
