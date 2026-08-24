"use client";

import { useRef, useState } from "react";
import { LIGHTNESS_MAX } from "@/core/color";
import { setLightness } from "@/core/edits";
import {
  draggedLightness,
  lightnessReversals,
  markersOf,
  nudgedLightness,
  type LightnessReversal,
} from "@/core/lightness-scale";
import type { Palette } from "@/core/palette";
import type { Selection } from "@/core/selection";

type LightnessScaleProps = {
  palette: Palette;
  onChange: (palette: Palette) => void;
  /** The Row the Cross-section is following, whose marker is the highlighted one. */
  selected: Selection;
  onSelect: (selection: Selection) => void;
};

/**
 * What the warning says, or nothing while the ladder runs one way. The whole
 * sentence is built here rather than split around a joined list, so the reading
 * of it is in one place.
 */
function warningFor(reversals: readonly LightnessReversal[]): string {
  if (reversals.length === 0) return "";
  const pairs = reversals.map(
    ({ above, below }) => `sockets ${above.number} and ${below.number}`,
  );
  return `Lightness turns back between ${pairs.join(", and between ")}, so the ladder no longer runs one way.`;
}

/**
 * The Lightness scale: one track carrying every Row's Lightness, so the ramp's
 * spacing is legible at a glance and tunable in place.
 *
 * The track is a neutral black-to-white gradient rather than a tinted one,
 * because the scale belongs to the whole Palette and not to the focused
 * Spectrum. It carries no labels: every number is already in the ladder, and
 * spacing is carried entirely by where the markers sit.
 *
 * A drag snaps to half a percent; the ladder's fields still take arbitrary
 * precision, so a marker may sit at a value no drag could have produced.
 */
export function LightnessScale({
  palette,
  onChange,
  selected,
  onSelect,
}: LightnessScaleProps) {
  const track = useRef<HTMLDivElement>(null);
  /** The Row a pointer is currently dragging, or null while none is held. */
  const [dragging, setDragging] = useState<number | null>(null);
  const reversals = lightnessReversals(palette);

  /** Where along the track the pointer is, as a fraction of its width. */
  function fractionAt(clientX: number): number {
    const box = track.current?.getBoundingClientRect();
    if (!box || box.width === 0) return 0;
    return (clientX - box.left) / box.width;
  }

  function drag(index: number, clientX: number) {
    onChange(
      setLightness(palette, index, draggedLightness(fractionAt(clientX))),
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {/* The padding is half a marker: the end markers straddle 0% and 100%
          rather than being pushed inside the track to stay in the box. */}
      <div className="px-1.5">
        <div
          ref={track}
          className="relative h-8 rounded-md ring-1 ring-zinc-300 dark:ring-zinc-700"
          style={{
            backgroundImage:
              "linear-gradient(to right, oklch(0% 0 0), oklch(100% 0 0))",
          }}
        >
          {markersOf(palette).map(({ socket, index, lightness, position }) => (
            /* A slider rather than a bare draggable box, so the same value the
               pointer nudges can be nudged from the keyboard. The white casing
               keeps the marker readable at the black end of the track and the
               dark ring keeps it readable at the white end. */
            <button
              key={socket.number}
              type="button"
              role="slider"
              aria-label={`Lightness at socket ${socket.number}`}
              aria-valuemin={0}
              aria-valuemax={LIGHTNESS_MAX}
              aria-valuenow={lightness}
              aria-valuetext={`${lightness}%`}
              onPointerDown={(event) => {
                if (event.button !== 0) return;
                onSelect(index);
                event.currentTarget.setPointerCapture(event.pointerId);
                setDragging(index);
              }}
              onPointerMove={(event) => {
                if (dragging !== index) return;
                drag(index, event.clientX);
              }}
              onPointerUp={() => setDragging(null)}
              onPointerCancel={() => setDragging(null)}
              onFocus={() => onSelect(index)}
              onKeyDown={(event) => {
                const direction =
                  event.key === "ArrowLeft" || event.key === "ArrowDown"
                    ? -1
                    : event.key === "ArrowRight" || event.key === "ArrowUp"
                      ? 1
                      : 0;
                if (direction === 0) return;
                event.preventDefault();
                // The same grid the drag snaps to, so the two ways of moving a
                // marker cannot leave it somewhere the other could not reach.
                onChange(
                  setLightness(
                    palette,
                    index,
                    nudgedLightness(lightness, direction),
                  ),
                );
              }}
              style={{ left: `${position * 100}%` }}
              /* The selected marker is lifted above the rest: two Rows are
                 allowed to share a Lightness, and the highlight is no use
                 underneath the marker of the Row sitting on top of it. */
              className={`absolute top-1/2 h-7 w-3 -translate-x-1/2 -translate-y-1/2 touch-none cursor-ew-resize rounded-sm border-2 border-white ring-1 dark:border-zinc-100 ${
                index === selected
                  ? "z-10 bg-sky-500 ring-sky-700"
                  : "bg-zinc-500 ring-zinc-900"
              }`}
            />
          ))}
        </div>
      </div>

      {/* Reported, never prevented: the ladder is allowed to stay this way, so
          the warning says what is out of order and leaves the Palette alone.
          The element stays in the document while there is nothing to say, so
          the warning is spoken when it appears rather than only when read. */}
      <p role="status" className="text-sm text-amber-600 dark:text-amber-500">
        {warningFor(reversals)}
      </p>
    </div>
  );
}
