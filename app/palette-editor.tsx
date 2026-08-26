"use client";

import { useState } from "react";
import { ColorTiles } from "./color-tiles";
import { CrossSection } from "./cross-section";
import { CopyButton } from "./copy-button";
import { LadderOrderWarning, LightnessScale } from "./lightness-scale";
import { PrefixField } from "./prefix-field";
import { RowLadder } from "./row-ladder";
import { SpectrumTabs, spectrumTabId } from "./spectrum-tabs";
import { formatCss } from "@/core/css";
import {
  activeSpectrum,
  activeSpectrumIndex,
  INITIAL_SELECTION,
  readingAt,
  selectedRowIndex,
} from "@/core/selection";
import { usePersistedPalette } from "./use-persisted-palette";
import { profileOf, type Palette } from "@/core/palette";
import type { Selection } from "@/core/selection";

/** The ladder is the tab strip's panel: one Spectrum is edited at a time. */
const LADDER_PANEL = "spectrum-ladder";

const HEADING =
  "text-sm font-medium tracking-wide text-zinc-600 uppercase dark:text-zinc-400";

/**
 * Holds the Palette being authored, and what the user is working on: one Row,
 * and one Active Spectrum. The Palette outlives the page: `initialPalette` is
 * only what is shown until the address bar or the last visit is read back.
 * Everything below is derived from the two on each render, so the tabs, the
 * tiles, the CSS and the Cross-section follow every keystroke without a sync
 * step.
 *
 * The arrangement is what the Cross-section's job demands. It is live feedback
 * while a Row is being typed into, so it may never scroll away: it rides
 * alongside the ladder, keeping pace with the page, for as long as there are
 * Rows to edit. Nothing here scrolls in a box of its own — the ladder sets the
 * height of the page, and the page is what scrolls. Narrow, the two columns
 * become one and the chart holds the top of the viewport instead, so it is
 * still in sight from the last Row of a long ladder.
 *
 * The tiles and the CSS describe the whole Palette rather than the selected
 * Row, so they sit below everything, clear of the editing surfaces, in the
 * order they are reached: look at the ramp, then take the CSS away.
 */
export function PaletteEditor({ initialPalette }: { initialPalette: Palette }) {
  const [palette, setPalette] = usePersistedPalette(initialPalette);
  const [selection, setSelection] = useState(INITIAL_SELECTION);
  const css = formatCss(palette);
  // Read back through the selection's own rules, so a Row or a Spectrum removed
  // out from under it leaves it on the last of what remains, not on nothing.
  const selectedRow = selectedRowIndex(palette, selection);
  const active = activeSpectrumIndex(palette, selection);
  const spectrum = activeSpectrum(palette, selection);
  const profile = profileOf(palette, spectrum);
  const reading = readingAt(palette, selection);

  // Each is set against the other's settled value, which is what retires a
  // stale index: choosing a Row also lands the Active Spectrum for good.
  function selectRow(row: number): void {
    setSelection({ row, spectrum: active });
  }

  function activateSpectrum(index: number): void {
    setSelection({ row: selectedRow, spectrum: index });
  }

  // A Tile stands at a Row and a Spectrum at once, so it names both rather than
  // setting one against the other's settled value: clicking a Tile in another
  // Spectrum's column moves the tab and the ladder in the one action.
  function selectTile(tile: Selection): void {
    setSelection(tile);
  }

  return (
    <div className="flex w-full flex-col gap-10">
      {/* The two columns hold down to `lg`, which they can because the chart
          column is sized in viewport widths rather than fixed: it gives width
          back to the ladder as the window narrows and is only at full size
          where there is room for both. Below `lg` there is not, and the single
          column is the better of the two layouts anyway. */}
      <div className="flex flex-col gap-8 lg:grid lg:grid-cols-[minmax(0,1fr)_clamp(20rem,42vw,36rem)] lg:items-start lg:gap-8 xl:gap-10">
        <div className="order-2 flex flex-col gap-6 lg:order-1">
          <h2 className={HEADING}>Palette</h2>
          <PrefixField palette={palette} onChange={setPalette} />
          <SpectrumTabs
            palette={palette}
            onChange={setPalette}
            active={active}
            onActivate={activateSpectrum}
            panelId={LADDER_PANEL}
          />
          {/* The scale belongs to the whole Palette rather than to one Row, so
              it stands beside the ladder rather than sitting inside it, and
              grows with it: the two read the same ladder the same way up. Too
              narrow for both, it goes above instead — a column of number fields
              squeezed to fit the track beside it is no longer editable. */}
          <div className="flex flex-col items-start gap-4 sm:flex-row sm:items-stretch">
            <LightnessScale
              palette={palette}
              onChange={setPalette}
              selected={selectedRow}
              onSelect={selectRow}
            />
            {/* The ladder alone is the tabs' panel. The scale is not: it carries
                the Lightness every Spectrum shares, so it belongs to the Palette
                rather than to whichever tab is showing. */}
            <div
              id={LADDER_PANEL}
              role="tabpanel"
              aria-labelledby={spectrumTabId(spectrum.id)}
              className="w-full min-w-0 sm:flex-1"
            >
              <RowLadder
                palette={palette}
                spectrum={spectrum}
                profile={profile}
                onChange={setPalette}
                selected={selectedRow}
                onSelect={selectRow}
              />
            </div>
          </div>
          <LadderOrderWarning palette={palette} />
        </div>

        {/* Sticky rather than scrolling: the chart travels down the page with
            whichever Row is being edited and comes to rest when the ladder
            beside it runs out, since past that there is nothing left to edit.
            Narrow, it holds the top of the viewport instead, shrunk to sit
            beside its readout so it costs a band and not a screen. */}
        <section className="bg-background sticky top-0 z-10 order-1 flex flex-col gap-3 border-b border-zinc-200 py-3 lg:top-6 lg:order-2 lg:border-0 lg:py-0 dark:border-zinc-800">
          <h2 className={HEADING}>Cross-section</h2>
          <div className="flex items-center gap-4 lg:block lg:space-y-3">
            <div className="w-40 shrink-0 sm:w-48 md:w-64 lg:w-full">
              <CrossSection reading={reading} />
            </div>
            {/* The readout names the Row the chart is following, so the ring
                and the line can be read back as numbers rather than
                eyeballed. */}
            <p className="font-mono text-sm text-zinc-600 tabular-nums dark:text-zinc-400">
              Shade {reading.socket.number} — {reading.color.lightness}%
              lightness, {reading.color.chroma} chroma, {reading.color.hue}° hue
            </p>
          </div>
        </section>
      </div>

      {/* Every Spectrum at once, which the ladder above cannot show: a column
          per Spectrum, a row per Shade, and each Tile a way back into the
          ladder editing the color it shows. */}
      <section className="flex flex-col gap-3">
        <h2 className={HEADING}>Tiles</h2>
        <ColorTiles
          palette={palette}
          selection={selection}
          onSelect={selectTile}
        />
      </section>

      <section className="flex flex-col gap-3">
        <div className="flex items-center justify-between gap-4">
          <h2 className={HEADING}>CSS</h2>
          <CopyButton text={css} label="Copy CSS" />
        </div>
        <pre className="overflow-x-auto rounded-lg border border-zinc-200 bg-zinc-50 p-4 font-mono text-sm dark:border-zinc-800 dark:bg-zinc-900">
          <code>{css}</code>
        </pre>
      </section>
    </div>
  );
}
