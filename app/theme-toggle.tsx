"use client";

import { THEME_STORAGE_KEY } from "./theme";

/**
 * Switches the page between the two grounds. Both are needed to judge a
 * Palette: a tile that reads clearly on black can vanish on white, and the
 * contrast a Spectrum will actually be used at is only visible against the
 * ground it will be used on.
 *
 * The class is written straight to the document rather than held in React
 * state. It is already on the server-rendered HTML and already changed by the
 * pre-paint script in `./theme`, so a second copy of it here could only disagree —
 * and the two labels are picked out by the same `dark:` variant as everything
 * else on the page, which needs no state to be correct.
 */
export function ThemeToggle() {
  function toggle() {
    const dark = document.documentElement.classList.toggle("dark");
    try {
      window.localStorage.setItem(THEME_STORAGE_KEY, dark ? "dark" : "light");
    } catch {
      // Storage can be denied outright. The choice still holds for this visit.
    }
  }

  return (
    <button
      type="button"
      onClick={toggle}
      className="rounded-md border border-zinc-300 px-3 py-1.5 text-sm font-medium text-zinc-700 hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
    >
      {/* The button names the ground it switches to, not the one in use. */}
      <span className="dark:hidden">Dark background</span>
      <span className="hidden dark:inline">Light background</span>
    </button>
  );
}
