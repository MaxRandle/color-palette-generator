"use client";

import { useState, useSyncExternalStore } from "react";
import { encodePalette } from "@/core/palette-code";
import { restoredPalette } from "@/core/restore";
import type { Palette } from "@/core/palette";

/** Where the last edit is kept between visits. */
const STORAGE_KEY = "color-palette-generator:palette";

/**
 * How long the Palette has to stop changing before it is written out. Every
 * keystroke is an edit, and browsers rate-limit `replaceState`; a pause this
 * short is imperceptible and keeps a held-down arrow key from spending the
 * budget.
 */
const SETTLE_MS = 250;

/**
 * The code in the address bar. `location.hash` hands back the fragment exactly
 * as written, which is what the code wants: it escapes its own delimiters, and
 * decoding the fragment as a whole here would turn an escaped delimiter inside
 * a Spectrum name back into a delimiter and split the code in the wrong place.
 */
function fragmentCode(): string | null {
  const fragment = window.location.hash.slice(1);
  return fragment === "" ? null : fragment;
}

function lastVisitCode(): string | null {
  try {
    return window.localStorage.getItem(STORAGE_KEY);
  } catch {
    // Storage can be denied outright. The starter Palette is still a Palette.
    return null;
  }
}

function writeCode(code: string): void {
  // `replaceState`, never `pushState`: an edit is not a navigation, and a
  // history entry per keystroke would bury the page the user arrived from.
  window.history.replaceState(null, "", `#${code}`);
  try {
    window.localStorage.setItem(STORAGE_KEY, code);
  } catch {
    // A full or denied store loses the last-edit restore, nothing else.
  }
}

/**
 * The Palette, held outside React so that the address bar and localStorage —
 * which the server rendering this page knows nothing about — can be read
 * without the first client render having to disagree with the HTML it is
 * hydrating. React reads the starter Palette while hydrating and the restored
 * one immediately after.
 */
function createStore(starter: Palette) {
  let current: Palette | null = null;
  let settling: number | undefined;
  const listeners = new Set<() => void>();

  return {
    subscribe(listener: () => void) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },

    /** What the browser holds, read once and then kept in step by `set`. */
    read(): Palette {
      current ??= restoredPalette(fragmentCode(), lastVisitCode(), starter);
      return current;
    },

    set(palette: Palette): void {
      current = palette;
      for (const listener of listeners) listener();
      window.clearTimeout(settling);
      settling = window.setTimeout(
        () => writeCode(encodePalette(palette)),
        SETTLE_MS,
      );
    },
  };
}

/**
 * The Palette being authored: restored from the address bar, or failing that
 * from the last visit, and written back to both as it is edited.
 */
export function usePersistedPalette(
  starter: Palette,
): [Palette, (palette: Palette) => void] {
  const [store] = useState(() => createStore(starter));
  // The third snapshot is what the statically exported HTML was rendered
  // with, so hydration has nothing to disagree about; React reads the restored
  // Palette immediately afterwards.
  const palette = useSyncExternalStore(
    store.subscribe,
    store.read,
    () => starter,
  );
  return [palette, store.set];
}
