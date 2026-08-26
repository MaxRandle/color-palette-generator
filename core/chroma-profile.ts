/**
 * A Chroma profile's name and its id, per ADR-0005. Unlike a Spectrum's name,
 * the name reaches no CSS: it is a caption on the control that picks a profile,
 * so it is free text and held only to being present and to being unique, which
 * is what the control needs to be trusted. The id is separate, minted once and
 * never shown: a Spectrum's choice and every Row's Chroma are held against it,
 * so renaming touches no authored value and leaves a shared code valid.
 */

import type { ChromaProfile } from "./palette";

/**
 * Why this name cannot name the profile with this id, or null if it can. A
 * profile's own current name is not a clash with itself, so a name that is
 * merely unchanged passes.
 */
export function chromaProfileNameError(
  profiles: readonly ChromaProfile[],
  id: string,
  name: string,
): string | null {
  if (name.trim() === "") return "Chroma profile name cannot be empty";
  const clash = profiles.some(
    (profile) => profile.id !== id && profile.name === name,
  );
  if (clash) return `Another chroma profile is already called ${name}`;
  return null;
}

/**
 * A profile these ones leave room for: the lowest number free as both an id and
 * a name. Numbering starts at two because the Palette a profile is added to
 * already has a first one.
 *
 * The name is spelled out rather than matching the id, as a Spectrum's minted
 * pair does: it is a caption to be read and typed over, not an identifier, and
 * the field it lands in takes focus with it selected.
 */
export function mintChromaProfile(
  profiles: readonly ChromaProfile[],
): ChromaProfile {
  const ids = new Set(profiles.map((profile) => profile.id));
  const names = new Set(profiles.map((profile) => profile.name));
  let number = 2;
  while (ids.has(`p${number}`) || names.has(`profile ${number}`)) number += 1;
  return { id: `p${number}`, name: `profile ${number}` };
}
