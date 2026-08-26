/**
 * A Spectrum's name and its id, per ADR-0004. The name is a fragment of every
 * custom property the Spectrum emits, so it is validated as a CSS identifier
 * and refused if another Spectrum already holds it. The id is separate, minted
 * once and never shown: a Row's Stops are held against it, so renaming touches
 * no authored color and leaves a Palette code already shared still valid.
 */

import { isCssIdent } from "./css-ident";
import type { Spectrum } from "./palette";

/**
 * Why this name cannot name the Spectrum with this id, or null if it can. The
 * Spectrum's own current name is not a clash with itself, so a name that is
 * merely unchanged passes.
 */
export function spectrumNameError(
  spectrums: readonly Spectrum[],
  id: string,
  name: string,
): string | null {
  if (name.trim() === "") return "Spectrum name cannot be empty";
  if (!isCssIdent(name)) {
    return "Spectrum name can only contain letters, digits, hyphens and underscores";
  }
  const clash = spectrums.some(
    (spectrum) => spectrum.id !== id && spectrum.name === name,
  );
  if (clash) return `Another spectrum is already called ${name}`;
  return null;
}

/**
 * A Spectrum these ones leave room for: the lowest `s2`, `s3`, … free as both
 * an id and a name. Numbering starts at two because the Palette a Spectrum is
 * added to already has a first one.
 *
 * Id and name start out identical, as the starter Palette's do. The name is the
 * only thing distinguishing a new Spectrum from the one it copies, so it is
 * what the user is sent to type; the id it happens to match never changes with
 * it. Ids are unique only within one Palette and mean nothing outside it.
 */
export function mintSpectrum(spectrums: readonly Spectrum[]): Spectrum {
  const taken = new Set(
    spectrums.flatMap((spectrum) => [spectrum.id, spectrum.name]),
  );
  let number = 2;
  while (taken.has(`s${number}`)) number += 1;
  return { id: `s${number}`, name: `s${number}` };
}
