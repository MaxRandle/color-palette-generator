"use client";

import { useRef } from "react";
import { tileRowsOf } from "@/core/cells";
import { heldSelection, type Selection } from "@/core/selection";
import type { Palette } from "@/core/palette";

type ColorTilesProps = {
  palette: Palette;
  /** The selected Row and the Active Spectrum: the Tile these two cross at is the current one. */
  selection: Selection;
  onSelect: (selection: Selection) => void;
};

/**
 * A Tile is addressed by the pair it stands at, so focus can be sent to the
 * Tile a key names without holding a ref per Tile — there is one per Row per
 * Spectrum, and they come and go with every add and remove.
 */
function tileKey({ row, spectrum }: Selection): string {
  return `${row}-${spectrum}`;
}

/**
 * Shared by every Tile, so a column is one width and a row one height however
 * many Spectrums the grid has grown. The gap is what the 7rem floor is measured
 * from: the two specimens and the space between them are what a Tile must carry.
 */
const TILE_BODY = "flex h-14 items-center justify-center gap-8 text-lg font-medium";

/**
 * The Tile grid: a row per Socket, a column per Spectrum, the Shade number
 * written once down the left. Per ADR-0003 the ladder edits one Spectrum at a
 * time, so this is the only surface showing them all, and a Socket's Tiles
 * standing in one row is what makes ADR-0001's shared Lightness ladder visible
 * rather than merely promised.
 *
 * A tile clamps between 7rem and 10rem. The floor is measured rather than
 * chosen: the two "Aa" specimens and the gap between them are 77px of
 * unavoidable content, and much under 7rem they sit flush against the edges and
 * the tile reads as a label strip instead of a field of color. Once the columns
 * cannot each hold that, the grid scrolls sideways rather than shrinking past
 * it — a tile too narrow to carry its specimens cannot answer the question they
 * are there to answer.
 *
 * Every Tile is a control, because the grid is where a wrong color is noticed:
 * clicking one makes its Spectrum Active and selects its Row, so the ladder and
 * the Cross-section land on the color that was clicked rather than leaving the
 * user to find that Spectrum in the tabs and that Shade in the ladder by hand.
 *
 * That is a focusable control per Row per Spectrum on a page already dense with
 * them, so the grid is a real `grid` with a roving tabindex: the whole thing is
 * one tab stop, and the arrow keys walk it in two dimensions. The tab stop is
 * the current Tile, so tabbing in lands on the color the rest of the page is
 * following. Moving selects as it goes, as the Spectrum tabs do — selecting is
 * harmless, and a Tile the arrow keys have reached but not selected would put
 * the mark and the focus ring on two different colors.
 */
export function ColorTiles({ palette, selection, onSelect }: ColorTilesProps) {
  const grid = useRef<HTMLDivElement>(null);
  const rows = tileRowsOf(palette);
  const { row: selectedRow, spectrum: active } = heldSelection(palette, selection);

  /** Focus rides along with the selection: the mark and the focus ring name one Tile. */
  function select(next: Selection): void {
    const held = heldSelection(palette, next);
    onSelect(held);
    const tile = grid.current?.querySelector<HTMLElement>(
      `[data-tile="${tileKey(held)}"]`,
    );
    tile?.focus();
  }

  function handleKeyDown(event: React.KeyboardEvent, at: Selection): void {
    const { row, spectrum } = at;
    const lastSpectrum = palette.spectrums.length - 1;
    const next = ((): Selection | null => {
      switch (event.key) {
        case "ArrowUp":
          return { row: row - 1, spectrum };
        case "ArrowDown":
          return { row: row + 1, spectrum };
        case "ArrowLeft":
          return { row, spectrum: spectrum - 1 };
        case "ArrowRight":
          return { row, spectrum: spectrum + 1 };
        // Home and End walk the Socket's row; with a modifier they leave the
        // grid's far corners one press away however long the ladder has grown.
        case "Home":
          return { row: event.ctrlKey || event.metaKey ? 0 : row, spectrum: 0 };
        case "End":
          return {
            row: event.ctrlKey || event.metaKey ? rows.length - 1 : row,
            spectrum: lastSpectrum,
          };
        default:
          return null;
      }
    })();
    if (next === null) return;
    event.preventDefault();
    select(next);
  }

  return (
    // The scroller, not the grid: the grid is sized by its columns, and once
    // they no longer fit it is this box that carries the overflow.
    <div className="overflow-x-auto">
      <div
        ref={grid}
        role="grid"
        aria-label="Palette tiles"
        className="grid w-fit gap-2"
        style={{
          gridTemplateColumns: `auto repeat(${palette.spectrums.length}, minmax(7rem, 10rem))`,
        }}
      >
        {/* Each row is a grid of its own borrowing the tracks above, so a
            Socket's Tiles line up across every column without the row boxes
            leaving the layout — `display: contents` would align them just as
            well, but it has a history of taking the row and cell roles out of
            the accessibility tree with it, and those roles are what this grid
            is spelt out for. */}
        <div role="row" className="col-span-full grid grid-cols-subgrid gap-2">
          {/* The Shade column's header names the column of numbers below it. */}
          <span
            role="columnheader"
            className="px-1 text-xs font-medium tracking-wide text-zinc-600 uppercase dark:text-zinc-400"
          >
            Shade
          </span>
          {palette.spectrums.map((spectrum, index) => (
            <span
              key={spectrum.id}
              role="columnheader"
              className={`truncate px-1 text-xs font-medium tracking-wide uppercase ${
                index === active
                  ? "text-sky-700 dark:text-sky-300"
                  : "text-zinc-600 dark:text-zinc-400"
              }`}
            >
              {spectrum.name}
            </span>
          ))}
        </div>

        {rows.map(({ socket, cells }, row) => (
          <div
            key={socket.number}
            role="row"
            className="col-span-full grid grid-cols-subgrid gap-2"
          >
            <span
              role="rowheader"
              className="flex h-14 w-14 items-center justify-center rounded-lg border border-zinc-200 font-mono text-lg tabular-nums dark:border-zinc-800"
            >
              {socket.number}
            </span>
            {cells.map(({ spectrum, color }, index) => {
              const at: Selection = { row, spectrum: index };
              const current = row === selectedRow && index === active;
              return (
                <div key={spectrum.id} role="gridcell" className="grid">
                  <button
                    type="button"
                    data-tile={tileKey(at)}
                    tabIndex={current ? 0 : -1}
                    aria-current={current ? "true" : undefined}
                    aria-label={`${spectrum.name} shade ${socket.number}, ${color.hex}`}
                    onClick={() => select(at)}
                    onKeyDown={(event) => handleKeyDown(event, at)}
                    className={`${TILE_BODY} cursor-pointer rounded-lg ${
                      current ? "ring-2 ring-sky-500 ring-offset-2 ring-offset-white dark:ring-offset-zinc-950" : ""
                    }`}
                    style={{ backgroundColor: color.hex }}
                  >
                    {/* Decoration: the button is already named by its Spectrum,
                        its Shade and its hex. */}
                    <span aria-hidden className="text-white">
                      Aa
                    </span>
                    <span aria-hidden className="text-black">
                      Aa
                    </span>
                  </button>
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}
