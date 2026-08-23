"use client";

import { useDraft } from "./use-draft";
import { setPrefix } from "@/core/edits";
import { prefixError } from "@/core/prefix";
import type { Palette } from "@/core/palette";

/**
 * The prefix every custom property is named from. Invalid input stays in the
 * field while the user is editing, so they can see and fix what they typed, but
 * never reaches the Palette: the core seam refuses anything that would not be a
 * CSS identifier, and the field falls back to the last accepted prefix on blur.
 */
export function PrefixField({
  palette,
  onChange,
}: {
  palette: Palette;
  onChange: (palette: Palette) => void;
}) {
  const draft = useDraft(palette.prefix);
  const error = prefixError(draft.text);

  function handleChange(next: string) {
    draft.type(next);
    onChange(setPrefix(palette, next));
  }

  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor="prefix" className="text-sm font-medium">
        Variable prefix
      </label>
      <div className="flex items-center gap-2">
        <span aria-hidden className="font-mono text-sm text-zinc-500">
          --
        </span>
        <input
          id="prefix"
          type="text"
          value={draft.text}
          onChange={(event) => handleChange(event.target.value)}
          onBlur={draft.reset}
          aria-invalid={error !== null}
          aria-describedby={error ? "prefix-error" : undefined}
          className="w-40 rounded-md border border-zinc-300 bg-transparent px-2 py-1.5 font-mono text-sm aria-invalid:border-red-500 dark:border-zinc-700"
        />
        <span aria-hidden className="font-mono text-sm text-zinc-500">
          -100
        </span>
      </div>
      {/* Announced as it appears: the field is focused while the error changes. */}
      <p id="prefix-error" role="alert" className="min-h-5 text-sm text-red-600 dark:text-red-400">
        {error}
      </p>
    </div>
  );
}
