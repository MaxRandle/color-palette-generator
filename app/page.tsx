import { ColorTiles } from "./color-tiles";
import { CopyButton } from "./copy-button";
import { formatCss } from "@/core/css";
import { cellsOf } from "@/core/cells";
import { STARTER_PALETTE } from "@/core/starter-palette";

export default function Home() {
  const palette = STARTER_PALETTE;
  const css = formatCss(palette);

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-col gap-10 px-6 py-16">
      <header className="flex flex-col gap-2">
        <h1 className="text-2xl font-semibold tracking-tight">
          Oklch CSS palette generator
        </h1>
        <p className="text-zinc-600 dark:text-zinc-400">
          A ladder of rows authored in Oklch, exported as CSS custom properties
          in hex.
        </p>
      </header>

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
    </main>
  );
}
