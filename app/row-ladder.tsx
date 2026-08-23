"use client";

import { NumberField } from "./number-field";
import {
  addRow,
  canRemoveRow,
  CHROMA_MAX,
  LIGHTNESS_MAX,
  removeRow,
  setChroma,
  setHue,
  setLightness,
} from "@/core/edits";
import { socketsOf, type Palette, type Spectrum } from "@/core/palette";

type RowLadderProps = {
  palette: Palette;
  /** The Spectrum whose Stop each Row edits. v1 has exactly one. */
  spectrum: Spectrum;
  onChange: (palette: Palette) => void;
};

/**
 * The ladder of Rows, one per Socket: the Row's own Lightness plus the focused
 * Spectrum's Chroma and Hue. Adding and removing renumber the Sockets, because
 * a Socket's number is a property of its position.
 */
/** Shared by the header and every Row, so the columns line up. */
const COLUMNS = "grid grid-cols-[3rem_repeat(3,minmax(0,1fr))_2rem] gap-2";

export function RowLadder({ palette, spectrum, onChange }: RowLadderProps) {
  const removable = canRemoveRow(palette);

  return (
    <div className="flex flex-col gap-3">
      {/* Hidden from assistive technology: every input carries its own label. */}
      <div
        aria-hidden
        className={`${COLUMNS} text-xs font-medium tracking-wide text-zinc-500 uppercase`}
      >
        <span>Socket</span>
        <span>Lightness</span>
        <span>Chroma</span>
        <span>Hue</span>
      </div>

      <ol className="flex flex-col gap-2">
        {socketsOf(palette).map(({ socket, row }, index) => {
          const stop = row.stops[spectrum.id];
          const at = `at socket ${socket.number}`;
          return (
            <li
              key={socket.number}
              className={`${COLUMNS} items-center`}
            >
              <span className="font-mono text-sm text-zinc-500 tabular-nums">
                {socket.number}
              </span>
              <NumberField
                label={`Lightness ${at}`}
                value={row.lightness}
                min={0}
                max={LIGHTNESS_MAX}
                suffix="%"
                onCommit={(lightness) =>
                  onChange(setLightness(palette, index, lightness))
                }
              />
              <NumberField
                label={`Chroma ${at}`}
                value={stop.chroma}
                min={0}
                max={CHROMA_MAX}
                onCommit={(chroma) =>
                  onChange(setChroma(palette, index, spectrum.id, chroma))
                }
              />
              {/* No min or max: Hue is an angle, so out-of-range input wraps. */}
              <NumberField
                label={`Hue ${at}`}
                value={stop.hue}
                suffix="°"
                onCommit={(hue) => onChange(setHue(palette, index, spectrum.id, hue))}
              />
              {/* aria-disabled rather than disabled: the button stays focusable,
                  so the reason the last Row cannot go is reachable by keyboard. */}
              <button
                type="button"
                aria-disabled={!removable}
                aria-label={
                  removable
                    ? `Remove row ${at}`
                    : `Remove row ${at} — unavailable, the last row cannot be removed`
                }
                onClick={() => onChange(removeRow(palette, index))}
                className="rounded-md border border-zinc-300 py-1.5 text-sm text-zinc-600 hover:bg-zinc-100 aria-disabled:cursor-not-allowed aria-disabled:opacity-40 aria-disabled:hover:bg-transparent dark:border-zinc-700 dark:text-zinc-400 dark:hover:bg-zinc-800"
              >
                <span aria-hidden>&times;</span>
              </button>
            </li>
          );
        })}
      </ol>

      <div>
        <button
          type="button"
          onClick={() => onChange(addRow(palette))}
          className="rounded-md border border-zinc-300 px-3 py-1.5 text-sm font-medium text-zinc-700 hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
        >
          Add row
        </button>
      </div>
    </div>
  );
}
