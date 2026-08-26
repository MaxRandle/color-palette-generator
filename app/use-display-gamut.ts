"use client";

import { useSyncExternalStore } from "react";
import type { Gamut } from "@/core/color";

/**
 * What a screen wider than sRGB answers. Display P3 is the one wide gamut worth
 * asking about: it is what current screens actually have, and a screen that
 * reports more than P3 still shows P3 content correctly.
 */
const WIDE = "(color-gamut: p3)";

function subscribe(changed: () => void): () => void {
  const query = window.matchMedia(WIDE);
  query.addEventListener("change", changed);
  return () => query.removeEventListener("change", changed);
}

function currentGamut(): Gamut {
  return window.matchMedia(WIDE).matches ? "display-p3" : "srgb";
}

/**
 * The widest gamut the screen the page is on can show, following the window as
 * it is dragged between screens.
 *
 * sRGB until the browser has answered, which is also what the server renders:
 * the narrow gamut is the safe one to be wrong about for a frame, since every
 * color in it is a color the wide gamut holds too.
 */
export function useDisplayGamut(): Gamut {
  return useSyncExternalStore(subscribe, currentGamut, () => "srgb");
}
