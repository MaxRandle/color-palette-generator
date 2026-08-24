import type { PaletteCell } from "@/core/cells";

/**
 * One tile per Socket, laid out side by side in ladder order so a whole
 * Spectrum reads at once and an uneven step in it shows up as a visible jump
 * rather than something to be worked out from the numbers. Each tile carries
 * its Socket's number and hex, and "Aa" in both white and black, so the
 * legibility of text on that color is visible at a glance rather than inferred
 * from the hex.
 *
 * Tiles are kept narrow enough that a long ladder still fits across the page,
 * since comparing them side by side is the whole point; below the width where
 * even that stops fitting, they scroll sideways rather than squeezing past
 * reading.
 */
export function ColorTiles({ cells }: { cells: readonly PaletteCell[] }) {
  return (
    <div className="overflow-x-auto">
      <ol className="flex min-w-full gap-2">
        {cells.map(({ socket, color }) => (
          <li
            key={socket.number}
            className="flex min-w-16 flex-1 flex-col gap-1.5"
          >
            <span
              className="flex h-20 items-center justify-center gap-3 rounded-lg text-lg font-medium"
              style={{ backgroundColor: color.hex }}
            >
              {/* Decoration: the tile is already labelled by its number and hex. */}
              <span aria-hidden className="text-white">
                Aa
              </span>
              <span aria-hidden className="text-black">
                Aa
              </span>
            </span>
            <span className="flex flex-col font-mono text-xs text-zinc-600 tabular-nums dark:text-zinc-400">
              <span className="text-sm text-zinc-900 dark:text-zinc-100">
                {socket.number}
              </span>
              {color.hex}
            </span>
          </li>
        ))}
      </ol>
    </div>
  );
}
