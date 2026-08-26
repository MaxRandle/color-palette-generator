/**
 * The one test every fragment of a custom property name is held to. The prefix
 * and a Spectrum name are both spliced into `--prefix-name-100`, so both have
 * to be CSS identifiers: an unescaped space, brace or semicolon does not merely
 * look wrong, it ends the declaration and takes the rest of the block with it.
 */

/**
 * The CSS Syntax ident code points: letters, digits, underscore, hyphen and
 * anything non-ASCII. Escape sequences are deliberately not accepted — a name
 * worth typing does not need them.
 *
 * A custom property name is `--` followed by any ident sequence, which is why a
 * leading digit is allowed here: `--500s-100` is a valid name.
 */
const CSS_IDENT = /^[A-Za-z0-9_\-\u{80}-\u{10FFFF}]+$/u;

/** Whether this text can stand inside a custom property name unescaped. */
export function isCssIdent(text: string): boolean {
  return CSS_IDENT.test(text);
}
