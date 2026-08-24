"use client";

import { useEffect, useRef } from "react";
import {
  hueWheel,
  inkFor,
  plot,
  polar,
  radiusOf,
  outlineOf,
  srgbRegionBoundary,
  toPath,
  svgCoordinate,
  wheelColor,
} from "@/core/cross-section";
import type { OklchColor } from "@/core/color";
import { CHROMA_MAX } from "@/core/color";
import { sliceField } from "@/core/cross-section-field";
import type { Ink } from "@/core/cross-section";
import type { Reading } from "@/core/selection";

/** The chart's side, in SVG user units; it scales to whatever box it is given. */
const SIZE = 320;

/** An Oklch color as CSS. In gamut already, so no browser has to map it. */
function cssColor({ lightness, chroma, hue }: OklchColor): string {
  return `oklch(${lightness}% ${chroma} ${hue})`;
}

/** The rim: the radial axis runs from the center out to here. */
const RIM = SIZE / 2;

/**
 * Room outside the chart for the Hue markers. The viewBox is grown by it rather
 * than the chart shrunk into it, so nothing in the plotted area has to know the
 * markers are there.
 */
const MARGIN = 40;

/** Thin, as a border is: the wheel labels the axis, it does not fill the chart. */
const WHEEL_WIDTH = 4;

/**
 * The Hues marked around the wheel, every 30 degrees. They say which way the
 * angular axis runs and how far round a Hue is, which the wheel's colors alone
 * cannot: a line at 300 degrees is only readable against a marked 300.
 */
const MARKED_HUES = Array.from({ length: 12 }, (_, turn) => turn * 30);

const TICK_FROM = RIM + WHEEL_WIDTH / 2;
const TICK_TO = TICK_FROM + 5;
const LABEL_AT = TICK_TO + 13;

/**
 * The two inks, as strokes and as the casing under the accent. Near-black
 * rather than black and near-white rather than white: the field is the subject,
 * and a marker only has to be read, not to shout.
 */
const INK_STROKE: Record<Ink, string> = {
  light: "stroke-zinc-100",
  dark: "stroke-zinc-900",
};

/**
 * The casing's width, and how far it is let down towards the field. It is a
 * halo for the accent to sit in, not a second marker: at full strength on a
 * pale slice it reads as the marker itself and the accent disappears inside it.
 */
const CASING_WIDTH = 3;
const CASING_OPACITY = 0.55;

/** The accent's own width, wide enough to still be a line inside the casing. */
const MARKER_WIDTH = 1.5;

/**
 * The plotted area as a fraction of the viewBox, so the raster layer lands on
 * the same square the vector layer plots into, derived from the geometry
 * rather than restated as a second copy of it.
 *
 * Both the offset and the side, because a canvas is a replaced element: given
 * only insets it keeps its intrinsic size and quietly ignores the right and
 * bottom ones, which left the field a few pixels off-centre inside its own
 * wheel.
 */
const PLOT_OFFSET = `${(MARGIN / (SIZE + MARGIN * 2)) * 100}%`;
const PLOT_SIDE = `${(SIZE / (SIZE + MARGIN * 2)) * 100}%`;

/**
 * The slice interior, painted per pixel. It sits beneath the SVG, so the
 * indicators stay vector-crisp over a field that is only decoration, and it is
 * repainted on Lightness alone: Chroma and Hue edits move the indicators
 * without touching a pixel.
 *
 * The backing store is the chart's own SIZE rather than the device's pixels. A
 * field of color has no fine detail to lose, and the layer that does — the
 * outlines, the wheel, the indicators — is vector and above it.
 */
function SliceField({ lightness }: { lightness: number }) {
  const canvas = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const context = canvas.current?.getContext("2d");
    if (!context) return;
    const pixels = sliceField(lightness, SIZE);
    context.putImageData(new ImageData(pixels, SIZE, SIZE), 0, 0);
  }, [lightness]);

  return (
    <canvas
      ref={canvas}
      width={SIZE}
      height={SIZE}
      aria-hidden
      className="absolute rounded-full bg-zinc-50 dark:bg-zinc-900"
      style={{
        left: PLOT_OFFSET,
        top: PLOT_OFFSET,
        width: PLOT_SIDE,
        height: PLOT_SIDE,
      }}
    />
  );
}

/**
 * A horizontal slice through the color space at the selected Row's Lightness:
 * the slice interior painted as a field of color out to the Visible gamut's
 * Boundary, the sRGB region's contour drawn inside it, and the Row's own Chroma
 * and Hue over both — a ring at its Chroma and a line out at its Hue, so a Row
 * outside the sRGB region has its ring plainly outside the contour. The radial
 * axis is fixed from 0 to 0.5 Chroma at every Lightness, so slices are
 * comparable with each other.
 */
export function CrossSection({ reading }: { reading: Reading }) {
  const { lightness, chroma, hue } = reading.color;
  const hueLineEnd = plot(CHROMA_MAX, hue, SIZE);
  const ink = inkFor(lightness);

  /* Out to the radial maximum rather than to the Row's own Chroma: the line
     says which Hue is being edited, the ring says how much Chroma. Held as one
     shape so the casing and the accent cannot drift apart. */
  const markers = (
    <>
      <line
        x1={RIM}
        y1={RIM}
        x2={svgCoordinate(hueLineEnd.x)}
        y2={svgCoordinate(hueLineEnd.y)}
      />
      <circle cx={RIM} cy={RIM} r={svgCoordinate(radiusOf(chroma, SIZE))} />
    </>
  );

  return (
    <div className="relative aspect-square w-full max-w-sm">
      <SliceField lightness={lightness} />
      <svg
        viewBox={`${-MARGIN} ${-MARGIN} ${SIZE + MARGIN * 2} ${SIZE + MARGIN * 2}`}
        className="relative h-full w-full"
        role="img"
        aria-label={`Cross-section of the color space at ${lightness}% lightness, showing the visible gamut as a field of color, the sRGB region, and the selected row at ${chroma} chroma and ${hue} degrees of hue`}
      >
        <g strokeWidth={WHEEL_WIDTH} fill="none">
          {hueWheel(SIZE).map(({ hue: at, path }) => (
            <path
              key={at}
              d={path}
              stroke={cssColor(wheelColor(at))}
            />
          ))}
        </g>
        {MARKED_HUES.map((at) => {
          const from = polar(TICK_FROM, at, SIZE);
          const to = polar(TICK_TO, at, SIZE);
          const label = polar(LABEL_AT, at, SIZE);
          return (
            <g
              key={at}
              aria-hidden
              className="fill-zinc-500 stroke-zinc-300 dark:stroke-zinc-700"
            >
              <line
                x1={svgCoordinate(from.x)}
                y1={svgCoordinate(from.y)}
                x2={svgCoordinate(to.x)}
                y2={svgCoordinate(to.y)}
                strokeWidth={1}
              />
              <text
                x={svgCoordinate(label.x)}
                y={svgCoordinate(label.y)}
                stroke="none"
                textAnchor="middle"
                dominantBaseline="central"
                className="text-[11px]"
              >
                {at}°
              </text>
            </g>
          );
        })}
        <path
          d={toPath(outlineOf(srgbRegionBoundary(lightness), SIZE))}
          fill="none"
          strokeWidth={1}
          className={INK_STROKE[ink]}
        />
        {/* Drawn twice: a casing in the slice's own ink, then the accent over
            it. The accent is the selection's identity and is worth keeping at
            one color, so it is the casing that does the contrasting — and where
            the markers run past the Boundary onto the bare backdrop, where the
            casing has nothing to contrast with, the accent reads on its own. */}
        <g
          fill="none"
          className={INK_STROKE[ink]}
          strokeWidth={CASING_WIDTH}
          opacity={CASING_OPACITY}
        >
          {markers}
        </g>
        <g
          fill="none"
          strokeWidth={MARKER_WIDTH}
          className="stroke-sky-600 dark:stroke-sky-400"
        >
          {markers}
        </g>
      </svg>
    </div>
  );
}
