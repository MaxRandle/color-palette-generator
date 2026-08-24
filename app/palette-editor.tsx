"use client";

import { useState } from "react";
import { ColorTiles } from "./color-tiles";
import { CrossSection } from "./cross-section";
import { CopyButton } from "./copy-button";
import { LadderOrderWarning, LightnessScale } from "./lightness-scale";
import { PrefixField } from "./prefix-field";
import { RowLadder } from "./row-ladder";
import { cellsOf } from "@/core/cells";
import { formatCss } from "@/core/css";
import { INITIAL_SELECTION, readingAt, selectedIndex } from "@/core/selection";
import { usePersistedPalette } from "./use-persisted-palette";
import type { Palette } from "@/core/palette";

const HEADING = "text-sm font-medium tracking-wide text-zinc-500 uppercase";

/**
 * What holds a column against the top of the viewport once the page has
 * scrolled past the heading, and stops it growing taller than the viewport it
 * is being held against. The gap doubles into the height: the column is inset
 * by it top and bottom.
 */
const PINNED = "lg:sticky lg:top-6 lg:max-h-[calc(100dvh-3rem)]";

/**
 * Holds the Palette being authored, and which Row the user is working on. The
 * Palette outlives the page: `initialPalette` is only what is shown until the
 * address bar or the last visit is read back.
 * Everything below is derived from the pair on each render, so the tiles, the
 * CSS and the Cross-section follow every keystroke without a sync step.
 *
 * The arrangement is what the Cross-section's job demands. It is live feedback
 * while a Row is being typed into, so it may never scroll away: it and the
 * readout and CSS beside it stay put while the ladder — the one surface that
 * grows without bound — scrolls past them. Narrow, the two columns become one
 * and the chart holds the top of the viewport instead, so it is still in sight
 * from the last Row of a long ladder. The tiles describe the whole Palette
 * rather than the selected Row, so they run the full width underneath both
 * columns instead of standing beside the Row being edited.
 */
export function PaletteEditor({ initialPalette }: { initialPalette: Palette }) {
  const [palette, setPalette] = usePersistedPalette(initialPalette);
  const [selection, setSelection] = useState(INITIAL_SELECTION);
  const css = formatCss(palette);
  // v1 has one Spectrum, so the Row being followed is read from that one.
  const spectrum = palette.spectrums[0];
  const reading = readingAt(palette, spectrum, selection);

  return (
    <div className="flex w-full flex-col gap-8 lg:grid lg:grid-cols-[minmax(0,1fr)_24rem] lg:items-start lg:gap-x-10 lg:gap-y-8">
      {/* The scrolling column: wide enough, it takes a scrollbar of its own
          rather than lengthening the page, so a ladder of any length is walked
          without the column beside it moving. A second and third Spectrum would
          widen it, standing beside this ladder and sharing the one Lightness
          scale; nothing here is sized to a single Spectrum. */}
      <div
        className={`order-2 flex flex-col gap-6 lg:order-1 lg:overflow-y-auto lg:pr-4 ${PINNED}`}
      >
        <h2 className={HEADING}>Palette</h2>
        <PrefixField palette={palette} onChange={setPalette} />
        {/* The scale belongs to the whole Palette rather than to one Row, so
            it stands beside the ladder rather than sitting inside it, and grows
            with it: the two read the same ladder the same way up. Too narrow for
            both, it goes above instead — a column of number fields squeezed to
            fit the track beside it is no longer editable. */}
        <div className="flex flex-col items-start gap-4 sm:flex-row sm:items-stretch">
          <LightnessScale
            palette={palette}
            onChange={setPalette}
            selected={selectedIndex(palette, selection)}
            onSelect={setSelection}
          />
          {/* v1 edits the one Spectrum; with several, selection picks the focused one. */}
          <div className="w-full min-w-0 sm:flex-1">
            <RowLadder
              palette={palette}
              spectrum={spectrum}
              onChange={setPalette}
              selected={selectedIndex(palette, selection)}
              onSelect={setSelection}
            />
          </div>
        </div>
        <LadderOrderWarning palette={palette} />
      </div>

      {/* The column that stays put. `contents` narrow, so its two sections
          fall into the single column and can be ordered around the ladder
          independently: the chart above it, the CSS below. */}
      <div
        className={`contents lg:order-2 lg:flex lg:flex-col lg:gap-6 ${PINNED}`}
      >
        {/* Narrow, the chart holds the top of the viewport rather than
            scrolling off it, shrunk to sit beside its readout so it costs a
            band and not a screen. */}
        <section className="bg-background sticky top-0 z-10 order-1 flex flex-col gap-3 border-b border-zinc-200 py-3 lg:static lg:order-none lg:border-0 lg:py-0 dark:border-zinc-800">
          <h2 className={HEADING}>Cross-section</h2>
          <div className="flex items-center gap-4 lg:block lg:space-y-3">
            <div className="w-40 shrink-0 sm:w-48 lg:w-full">
              <CrossSection reading={reading} />
            </div>
            {/* The readout names the Row the chart is following, so the ring
                and the line can be read back as numbers rather than
                eyeballed. */}
            <p className="font-mono text-sm text-zinc-600 tabular-nums dark:text-zinc-400">
              Socket {reading.socket.number} — {reading.color.lightness}%
              lightness, {reading.color.chroma} chroma, {reading.color.hue}° hue
            </p>
          </div>
        </section>

        <section className="order-3 flex min-h-0 flex-col gap-3 lg:order-none lg:flex-1">
          <div className="flex items-center justify-between gap-4">
            <h2 className={HEADING}>CSS</h2>
            <CopyButton text={css} label="Copy CSS" />
          </div>
          {/* The block scrolls inside itself rather than lengthening the
              column, so a long Palette cannot push the chart off screen. */}
          <pre className="min-h-0 overflow-auto rounded-lg border border-zinc-200 bg-zinc-50 p-4 font-mono text-sm lg:flex-1 dark:border-zinc-800 dark:bg-zinc-900">
            <code>{css}</code>
          </pre>
        </section>
      </div>

      {/* One set of tiles per Spectrum, running under both columns: with
          several, they stack here in the same order they stand in above. They
          sit inside the grid rather than below it because that keeps the
          Cross-section pinned while they are being read — measured, rather
          than assumed: outside it, scrolling down to the tiles carries the
          chart off the top of the screen with it. */}
      {palette.spectrums.map((spectrum) => (
        <section
          key={spectrum.id}
          className="order-4 flex flex-col gap-3 lg:order-3 lg:col-span-2"
        >
          <h2 className={HEADING}>{spectrum.name}</h2>
          <ColorTiles cells={cellsOf(palette, spectrum)} />
        </section>
      ))}
    </div>
  );
}
