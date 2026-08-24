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
