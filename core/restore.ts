/**
 * Which Palette a fresh page opens with. Three sources can answer, and the
 * order between them is the whole of the rule, so it lives here rather than
 * in the browser plumbing that fetches them.
 */

import { decodePalette } from "./palette-code";
import type { Palette } from "./palette";

/**
 * The Palette to open, given the code in the address bar's fragment and the
 * code left by the last visit, either of which may be absent.
 *
 * The fragment outranks the last visit: opening someone's link shows their
 * work, not whatever this browser was last editing. A code neither of them can
 * supply — or one this build cannot read, such as a truncated link or a format
 * this build predates — leaves the starter Palette, so a link never quietly
 * shows something that is not in it. Nothing is overwritten until an edit.
 */
export function restoredPalette(
  fragment: string | null,
  stored: string | null,
  starter: Palette,
): Palette {
  const code = fragment ?? stored;
  if (code === null) return starter;
  return decodePalette(code) ?? starter;
}

/**
 * The Palette to switch to when the address bar changes under an open page —
 * a pasted link, or a step back through history.
 *
 * Unlike a fresh load, there is work in hand, so an unreadable fragment keeps
 * it rather than falling back to anything: a mistyped paste should not throw
 * away the Palette the user was editing.
 */
export function pastedPalette(
  fragment: string | null,
  current: Palette,
): Palette {
  if (fragment === null) return current;
  return decodePalette(fragment) ?? current;
}
