"use client";

import { useState } from "react";
import { ColorTiles } from "./color-tiles";
import { CrossSection } from "./cross-section";
import { CopyButton } from "./copy-button";
import { PrefixField } from "./prefix-field";
import { RowLadder } from "./row-ladder";
import { cellsOf } from "@/core/cells";
import { formatCss } from "@/core/css";
import { INITIAL_SELECTION, readingAt, selectedIndex } from "@/core/selection";
import type { Palette } from "@/core/palette";

/**
 * Holds the Palette being authored, and which Row the user is working on.
 * Everything below is derived from the pair on each render, so the tiles, the
 * CSS and the Cross-section follow every keystroke without a sync step.
 */
export function PaletteEditor({ initialPalette }: { initialPalette: Palette }) {
  const [palette, setPalette] = useState(initialPalette);
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
        {/* v1 edits the one Spectrum; with several, selection picks the focused one. */}
        <RowLadder
          palette={palette}
          spectrum={spectrum}
          onChange={setPalette}
          selected={selectedIndex(palette, selection)}
          onSelect={setSelection}
        />
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-medium tracking-wide text-zinc-500 uppercase">
          Cross-section
        </h2>
        {/* The readout names the Row the chart is following, so the ring and
            the line can be read back as numbers rather than eyeballed. */}
        <p className="font-mono text-sm text-zinc-600 tabular-nums dark:text-zinc-400">
          Socket {reading.socket.number} — {reading.lightness}% lightness,{" "}
          {reading.chroma} chroma, {reading.hue}° hue
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
