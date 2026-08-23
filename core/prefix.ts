/**
 * The prefix names every custom property the Palette emits, so it has to be a
 * CSS identifier. Anything else would not merely look wrong: an unescaped
 * space, brace or semicolon ends the declaration and takes the rest of the
 * block with it.
 */

/**
 * The CSS Syntax ident code points: letters, digits, underscore, hyphen and
 * anything non-ASCII. Escape sequences are deliberately not accepted — a
 * prefix worth typing does not need them.
 *
 * A custom property name is `--` followed by any ident sequence, which is why a
 * leading digit is allowed here: `--500s-100` is a valid name.
 */
const CSS_IDENT = /^[A-Za-z0-9_\-\u{80}-\u{10FFFF}]+$/u;

/** Why this prefix cannot name a custom property, or null if it can. */
export function prefixError(prefix: string): string | null {
  if (prefix.trim() === "") return "Prefix cannot be empty";
  if (!CSS_IDENT.test(prefix)) {
    return "Prefix can only contain letters, digits, hyphens and underscores";
  }
  return null;
}
