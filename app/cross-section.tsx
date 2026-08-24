import { CHROMA_MAX } from "@/core/color";
import { toPath, visibleGamutOutline } from "@/core/cross-section";

/** The chart's side, in SVG user units; it scales to whatever box it is given. */
const SIZE = 320;

/**
 * A horizontal slice through the color space at one Lightness: the Visible
 * gamut's Boundary, filled. The radial axis is fixed from 0 to 0.5 Chroma at
 * every Lightness, so slices are comparable with each other.
 */
export function CrossSection({ lightness }: { lightness: number }) {
  const center = SIZE / 2;

  return (
    <svg
      viewBox={`0 0 ${SIZE} ${SIZE}`}
      className="aspect-square w-full max-w-sm"
      role="img"
      aria-label={`Cross-section of the color space at ${lightness}% lightness, showing the visible gamut`}
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
      <text
        x={center}
        y={SIZE - 6}
        textAnchor="middle"
        className="fill-zinc-500 text-[10px]"
      >
        {`chroma 0 to ${CHROMA_MAX}`}
      </text>
    </svg>
  );
}
