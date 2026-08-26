/**
 * The prefix names every custom property the Palette emits, so it has to be a
 * CSS identifier — the same rule a Spectrum name is held to, and for the same
 * reason.
 */

import { isCssIdent } from "./css-ident";

/** Why this prefix cannot name a custom property, or null if it can. */
export function prefixError(prefix: string): string | null {
  if (prefix.trim() === "") return "Prefix cannot be empty";
  if (!isCssIdent(prefix)) {
    return "Prefix can only contain letters, digits, hyphens and underscores";
  }
  return null;
}
