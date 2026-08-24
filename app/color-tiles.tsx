import type { PaletteCell } from "@/core/cells";

/**
 * One tile per Socket, stacked in ladder order: the Socket's number alongside
 * its color carrying "Aa" in both white and black, so the legibility of text on
 * that color is visible at a glance rather than inferred from the hex.
 */
export function ColorTiles({ cells }: { cells: readonly PaletteCell[] }) {
  return (
    <ol className="flex flex-col gap-2">
      {cells.map(({ socket, color }) => (
        <li key={socket.number} className="grid grid-cols-2 gap-2">
          <span className="flex h-14 items-center justify-center rounded-lg border border-zinc-200 font-mono text-lg dark:border-zinc-800">
            {socket.number}
          </span>
          <span
            className="flex h-14 items-center justify-center gap-8 rounded-lg text-lg font-medium"
            style={{ backgroundColor: color.hex }}
          >
            {/* Decoration: the row is already labelled by its number and hex. */}
            <span aria-hidden className="text-white">
              Aa
            </span>
            <span aria-hidden className="text-black">
              Aa
            </span>
            <span className="sr-only">{color.hex}</span>
          </span>
        </li>
      ))}
    </ol>
  );
}
