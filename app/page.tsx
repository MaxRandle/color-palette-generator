import { PaletteEditor } from "./palette-editor";
import { ThemeToggle } from "./theme-toggle";
import { STARTER_PALETTE } from "@/core/starter-palette";

export default function Home() {
  return (
    <main className="mx-auto flex w-full max-w-[90rem] flex-col gap-8 px-6 py-10">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex flex-col gap-2">
          <h1 className="text-2xl font-semibold tracking-tight">
            Oklch CSS palette generator
          </h1>
          <p className="text-zinc-600 dark:text-zinc-400">
            A ladder of rows authored in Oklch, exported as CSS custom
            properties in hex.
          </p>
        </div>
        {/* At the top, above everything it changes the ground under. */}
        <ThemeToggle />
      </header>

      <PaletteEditor initialPalette={STARTER_PALETTE} />
    </main>
  );
}
