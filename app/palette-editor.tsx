"use client";

import { useState } from "react";
import { ColorTiles } from "./color-tiles";
import { CrossSection } from "./cross-section";
import { CopyButton } from "./copy-button";
import { PrefixField } from "./prefix-field";
import { RowLadder } from "./row-ladder";
import { cellsOf } from "@/core/cells";
import { formatCss } from "@/core/css";
import type { Palette } from "@/core/palette";

/**
 * The Lightness the Cross-section is drawn at. Fixed for now; the next ticket
 * hands it to the selected Row.
 */
const CROSS_SECTION_LIGHTNESS = 50;

/**
 * Holds the Palette being authored. Everything below is derived from it on each
 * render, so tiles and CSS follow every keystroke without a sync step.
 */
export function PaletteEditor({ initialPalette }: { initialPalette: Palette }) {
  const [palette, setPalette] = useState(initialPalette);
  const css = formatCss(palette);

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
          spectrum={palette.spectrums[0]}
          onChange={setPalette}
        />
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-medium tracking-wide text-zinc-500 uppercase">
          Cross-section at {CROSS_SECTION_LIGHTNESS}% lightness
        </h2>
        <CrossSection lightness={CROSS_SECTION_LIGHTNESS} />
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
