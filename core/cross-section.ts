/**
 * The geometry of the Cross-section: a horizontal slice through the Oklch color
 * space at one Lightness, in polar coordinates with angle as Hue and radius as
 * Chroma.
 */

import { CHROMA_MAX } from "./color";
import { maxChroma } from "./gamut/max-chroma";

export type Point = { readonly x: number; readonly y: number };

const DEGREES = Math.PI / 180;

/**
 * One Chroma and Hue as a point in a square chart of this side, with the
 * neutral axis at the center. Hue runs counter-clockwise from the right, so it
 * reads the way the color wheel does rather than the way SVG's y axis points.
 */
export function plot(chroma: number, hue: number, size: number): Point {
  const center = size / 2;
  // The radial axis is the authoring ceiling at every Lightness, so a slice
  // never rescales: the shape shrinking towards white is the shape shrinking,
  // not the chart zooming.
  const radius = (chroma / CHROMA_MAX) * center;
  return {
    x: center + radius * Math.cos(hue * DEGREES),
    y: center - radius * Math.sin(hue * DEGREES),
  };
}

/** The Visible gamut's Boundary at one Lightness, once per degree of Hue. */
export function visibleGamutOutline(
  lightness: number,
  size: number,
): readonly Point[] {
  return Array.from({ length: 360 }, (_, hue) =>
    plot(maxChroma(lightness, hue), hue, size),
  );
}

/** An outline as a closed SVG path. */
export function toPath(points: readonly Point[]): string {
  return `${points
    .map(({ x, y }, index) => `${index === 0 ? "M" : "L"}${x.toFixed(3)} ${y.toFixed(3)}`)
    .join(" ")} Z`;
}
