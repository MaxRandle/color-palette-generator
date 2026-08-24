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

/**
 * Holds the Palette being authored, and which Row the user is working on. The
 * Palette outlives the page: `initialPalette` is only what is shown until the
 * address bar or the last visit is read back.
 * Everything below is derived from the pair on each render, so the tiles, the
 * CSS and the Cross-section follow every keystroke without a sync step.
 */
export function PaletteEditor({ initialPalette }: { initialPalette: Palette }) {
  const [palette, setPalette] = usePersistedPalette(initialPalette);
  const [selection, setSelection] = useState(INITIAL_SELECTION);
  const css = formatCss(palette);
  // v1 has one Spectrum, so the Row being followed is read from that one.
  const spectrum = palette.spectrums[0];
  const reading = readingAt(palette, spectrum, selection);

  return (
    <>
      <section className="flex flex-col gap-6">
        <h2 className="text-sm font-medium tracking-wide text-zinc-500 uppercase">
          Palette
        </h2>
        <PrefixField palette={palette} onChange={setPalette} />
        {/* The scale belongs to the whole Palette rather than to one Row, so
            it stands beside the ladder rather than sitting inside it, and
            grows with it: the two read the same ramp the same way up. Too
            narrow for both, it goes above instead — a column of number fields
            squeezed to fit the track beside it is no longer editable. */}
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
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-medium tracking-wide text-zinc-500 uppercase">
          Cross-section
        </h2>
        {/* The readout names the Row the chart is following, so the ring and
            the line can be read back as numbers rather than eyeballed. */}
        <p className="font-mono text-sm text-zinc-600 tabular-nums dark:text-zinc-400">
          Socket {reading.socket.number} — {reading.color.lightness}% lightness,{" "}
          {reading.color.chroma} chroma, {reading.color.hue}° hue
        </p>
        <CrossSection reading={reading} />
      </section>

      {palette.spectrums.map((spectrum) => (
        <section key={spectrum.id} className="flex flex-col gap-3">
          <h2 className="text-sm font-medium tracking-wide text-zinc-500 uppercase">
            {spectrum.name}
          </h2>
          <ColorTiles cells={cellsOf(palette, spectrum)} />
        </section>
      ))}

      <section className="flex flex-col gap-3">
        <div className="flex items-center justify-between gap-4">
          <h2 className="text-sm font-medium tracking-wide text-zinc-500 uppercase">
            CSS
          </h2>
          <CopyButton text={css} label="Copy CSS" />
        </div>
        <pre className="overflow-x-auto rounded-lg border border-zinc-200 bg-zinc-50 p-4 font-mono text-sm dark:border-zinc-800 dark:bg-zinc-900">
          <code>{css}</code>
        </pre>
      </section>
    </>
  );
}
