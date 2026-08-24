import {
  plot,
  radiusOf,
  srgbRegionOutline,
  toPath,
  visibleGamutOutline,
} from "@/core/cross-section";
import { CHROMA_MAX } from "@/core/color";
import type { Reading } from "@/core/selection";

/** The chart's side, in SVG user units; it scales to whatever box it is given. */
const SIZE = 320;

/**
 * A horizontal slice through the color space at the selected Row's Lightness:
 * the Visible gamut's Boundary filled, the sRGB region's contour inside it, and
 * the Row's own Chroma and Hue drawn over both — a ring at its Chroma and a
 * line out at its Hue, so a Row outside the sRGB region has its ring plainly
 * outside the contour. The radial axis is fixed from 0 to 0.5 Chroma at every
 * Lightness, so slices are comparable with each other.
 */
export function CrossSection({ reading }: { reading: Reading }) {
  const center = SIZE / 2;
  const { lightness, chroma, hue } = reading.color;
  const hueLineEnd = plot(CHROMA_MAX, hue, SIZE);

  return (
    <svg
      viewBox={`0 0 ${SIZE} ${SIZE}`}
      className="aspect-square w-full max-w-sm"
      role="img"
      aria-label={`Cross-section of the color space at ${lightness}% lightness, showing the visible gamut, the sRGB region, and the selected row at ${chroma} chroma and ${hue} degrees of hue`}
    >
      <circle
        cx={center}
        cy={center}
        r={center}
        className="fill-zinc-50 stroke-zinc-200 dark:fill-zinc-900 dark:stroke-zinc-800"
      />
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
        x1={center}
        y1={center}
        x2={hueLineEnd.x}
        y2={hueLineEnd.y}
        strokeWidth={1}
        className="stroke-sky-600 dark:stroke-sky-400"
      />
      <circle
        cx={center}
        cy={center}
        r={radiusOf(chroma, SIZE)}
        fill="none"
        strokeWidth={1}
        className="stroke-sky-600 dark:stroke-sky-400"
      />
    </svg>
  );
}
