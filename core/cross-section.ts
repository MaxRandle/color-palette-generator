/**
 * The geometry of the Cross-section: a horizontal slice through the Oklch color
 * space at one Lightness, in polar coordinates with angle as Hue and radius as
 * Chroma.
 */

import {
  CHROMA_MAX,
  fallbackFor,
  maxSrgbChroma,
  type OklchColor,
} from "./color";
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

/** Where 0 degrees of Hue points: straight up, a quarter turn off the x axis. */
const ZERO_HUE = 90;

/**
 * A distance and a Hue as a point in a square chart of this side, with the
 * neutral axis at the center. Hue starts straight up and runs clockwise, so it
 * reads the way a dial does rather than the way SVG's y axis points.
 *
 * The distance is in chart units rather than Chroma, so the chart's furniture
 * can sit outside the rim, where no Chroma reaches.
 */
export function polar(radius: number, hue: number, size: number): Point {
  const center = size / 2;
  const angle = (ZERO_HUE - hue) * DEGREES;
  return {
    x: center + radius * Math.cos(angle),
    y: center - radius * Math.sin(angle),
  };
}

/** One Chroma and Hue as a point in a square chart of this side. */
export function plot(chroma: number, hue: number, size: number): Point {
  return polar(radiusOf(chroma, size), hue, size);
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

/**
 * A little past one degree, so neighbouring arcs overlap. Butted arcs leave a
 * hairline of background showing between them once the renderer anti-aliases.
 */
const ARC_OVERLAP = 0.3;

/** One degree of the rim: the Hue it stands for, and the arc that draws it. */
export type HueArc = {
  readonly hue: number;
  readonly path: string;
};

/**
 * The rim as a wheel of Hues, one arc per degree, so the angular axis carries
 * the colors it stands for. Each arc is only a position on the rim: what color
 * to paint it is the caller's, since the wheel is fixed and owes nothing to the
 * Palette.
 */
export function hueWheel(size: number): readonly HueArc[] {
  const radius = radiusOf(CHROMA_MAX, size);
  const sweep = svgCoordinate(radius);
  return Array.from({ length: 360 }, (_, hue) => {
    const from = plot(CHROMA_MAX, hue, size);
    const to = plot(CHROMA_MAX, hue + 1 + ARC_OVERLAP, size);
    return {
      hue,
      // Sweep flag 1: Hue runs clockwise on screen, which is the direction
      // SVG's positive sweep goes once its y axis is pointing down.
      path: `${step("M", from)} A${sweep} ${sweep} 0 0 1 ${step("", to)}`,
    };
  });
}

/**
 * One Hue on the rim, with as much Chroma as the sRGB region holds at this
 * Lightness. It asks for the authoring ceiling and takes what it can get, so
 * each arc is the most vivid color there is where it sits.
 *
 * Through the Fallback rather than straight into an `oklch()` a browser would
 * have to gamut map: handed a color outside its gamut, a browser clips the
 * channels one by one, which shifts the Hue. At 100% Lightness the rim came back
 * magenta and yellow where white is the only color there is, and at 0% it came
 * back red and green rather than black.
 *
 * The Lightness is the slice's own, which is on trial: it shows the rim in the
 * colors the slice can really reach, but towards either end of the Lightness
 * axis there is so little Chroma to be had that the wheel stops working as a Hue
 * indicator at all.
 */
export function wheelColor(lightness: number, hue: number): OklchColor {
  return fallbackFor({ lightness, chroma: CHROMA_MAX, hue });
}

/**
 * A coordinate as it should reach the DOM. Rounded, because the server and the
 * browser disagree in the last bit or two of `Math.cos`, and React reads that
 * as a hydration mismatch. Three decimals is far finer than the chart can show.
 */
export function svgCoordinate(value: number): number {
  return Number(value.toFixed(3));
}

/** A point as an SVG path command: the letter, then the coordinates. */
function step(command: string, { x, y }: Point): string {
  return `${command}${svgCoordinate(x)} ${svgCoordinate(y)}`;
}

/** An outline as a closed SVG path. */
export function toPath(points: readonly Point[]): string {
  return `${points
    .map(({ x, y }, index) => `${index === 0 ? "M" : "L"}${x.toFixed(3)} ${y.toFixed(3)}`)
    .join(" ")} Z`;
}
