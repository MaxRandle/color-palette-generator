import {
  hueWheel,
  plot,
  polar,
  radiusOf,
  srgbRegionOutline,
  toPath,
  visibleGamutOutline,
} from "@/core/cross-section";
import { CHROMA_MAX } from "@/core/color";
import type { Reading } from "@/core/selection";

/** The chart's side, in SVG user units; it scales to whatever box it is given. */
const SIZE = 320;

/** The rim: the radial axis runs from the center out to here. */
const RIM = SIZE / 2;

/**
 * Room outside the chart for the Hue markers. The viewBox is grown by it rather
 * than the chart shrunk into it, so nothing in the plotted area has to know the
 * markers are there.
 */
const MARGIN = 40;

/**
 * The Lightness and Chroma the rim's Hues are painted at. Fixed, and nothing to
 * do with the selected Row: the wheel is the axis, so it has to look the same
 * whatever the slice inside it is doing. Written as `oklch()` rather than
 * through the Fallback because the rim is never exported — the Fallback's target
 * is sRGB because the output is hex, and this output is a screen.
 */
const WHEEL_LIGHTNESS = 60;
const WHEEL_CHROMA = 0.3;

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
 * A horizontal slice through the color space at the selected Row's Lightness:
 * the Visible gamut's Boundary filled, the sRGB region's contour inside it, and
 * the Row's own Chroma and Hue drawn over both — a ring at its Chroma and a line
 * out at its Hue, so a Row outside the sRGB region has its ring plainly outside
 * the contour. The radial axis is fixed from 0 to 0.5 Chroma at every Lightness,
 * so slices are comparable with each other.
 */
export function CrossSection({ reading }: { reading: Reading }) {
  const { lightness, chroma, hue } = reading.color;
  const hueLineEnd = plot(CHROMA_MAX, hue, SIZE);

  return (
    <svg
      viewBox={`${-MARGIN} ${-MARGIN} ${SIZE + MARGIN * 2} ${SIZE + MARGIN * 2}`}
      className="aspect-square w-full max-w-sm"
      role="img"
      aria-label={`Cross-section of the color space at ${lightness}% lightness, showing the visible gamut, the sRGB region, and the selected row at ${chroma} chroma and ${hue} degrees of hue`}
    >
      <circle
        cx={RIM}
        cy={RIM}
        r={RIM}
        className="fill-zinc-50 dark:fill-zinc-900"
      />
      <g strokeWidth={WHEEL_WIDTH} fill="none">
        {hueWheel(SIZE).map(({ hue: at, path }) => (
          <path
            key={at}
            d={path}
            stroke={`oklch(${WHEEL_LIGHTNESS}% ${WHEEL_CHROMA} ${at})`}
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
              x1={from.x}
              y1={from.y}
              x2={to.x}
              y2={to.y}
              strokeWidth={1}
            />
            <text
              x={label.x}
              y={label.y}
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
        d={toPath(visibleGamutOutline(lightness, SIZE))}
        className="fill-zinc-300 dark:fill-zinc-700"
      />
      <path
        d={toPath(srgbRegionOutline(lightness, SIZE))}
        fill="none"
        strokeWidth={1}
        className="stroke-zinc-600 dark:stroke-zinc-300"
      />
      {/* Out to the radial maximum rather than to the Row's own Chroma: the
          line says which Hue is being edited, the ring says how much Chroma. */}
      <line
        x1={RIM}
        y1={RIM}
        x2={hueLineEnd.x}
        y2={hueLineEnd.y}
        strokeWidth={1}
        className="stroke-sky-600 dark:stroke-sky-400"
      />
      <circle
        cx={RIM}
        cy={RIM}
        r={radiusOf(chroma, SIZE)}
        fill="none"
        strokeWidth={1}
        className="stroke-sky-600 dark:stroke-sky-400"
      />
    </svg>
  );
}
