"use client";

import { useState } from "react";
import { NameField } from "./name-field";
import { chromaProfileNameError } from "@/core/chroma-profile";
import {
  addChromaProfile,
  canRemoveChromaProfile,
  removeChromaProfile,
  renameChromaProfile,
  setSpectrumProfile,
} from "@/core/edits";
import {
  profileOf,
  spectrumsUsing,
  type Palette,
  type Spectrum,
} from "@/core/palette";

/**
 * The value the picker carries for "new profile", which is no profile's id: an
 * id is minted from the Palette rather than typed, so the option needs a value
 * of its own that no Palette can hold. Ids are `p` and a number.
 */
const NEW_PROFILE = "";

type ChromaProfileFieldProps = {
  palette: Palette;
  onChange: (palette: Palette) => void;
  /** The Active Spectrum, whose profile this picks. */
  spectrum: Spectrum;
};

/**
 * Which Chroma profile the Active Spectrum reads, and the name of that profile.
 *
 * Picking and editing are one control because they are one thing, per ADR-0006:
 * the ladder shows the Active Spectrum's profile, so choosing a profile to look
 * at is choosing the profile the Spectrum reads. A profile no Spectrum reads is
 * therefore reachable only by assigning it to one, which recolors that Spectrum
 * on the way in — the starter Palette's spare profiles included.
 *
 * It stands beside the Spectrum name, and is built from the same field, because
 * it is the Spectrum's other property. Removing is refused while a second
 * Spectrum reads the profile: that edit would recolor a Spectrum the user is
 * not looking at, and cannot be undone from the values left behind. The button
 * says so rather than disappearing.
 */
export function ChromaProfileField({
  palette,
  onChange,
  spectrum,
}: ChromaProfileFieldProps) {
  const profile = profileOf(palette, spectrum);
  const removable = canRemoveChromaProfile(palette, profile.id);
  const readers = spectrumsUsing(palette, profile.id).length;
  /** The profile this control minted, whose name is waiting to be typed over. */
  const [minted, setMinted] = useState<string | null>(null);

  /**
   * The new profile is a verbatim copy of the one the Spectrum was reading, so
   * nothing changes color and its name is the only thing worth typing first.
   */
  function add(): void {
    const added = addChromaProfile(palette, spectrum.id);
    onChange(added);
    setMinted(added.profiles[added.profiles.length - 1].id);
  }

  function pick(value: string): void {
    if (value === NEW_PROFILE) {
      add();
      return;
    }
    onChange(setSpectrumProfile(palette, spectrum.id, value));
    setMinted(null);
  }

  function remove(): void {
    if (!removable) return;
    onChange(removeChromaProfile(palette, profile.id));
    setMinted(null);
  }

  return (
    <NameField
      /* Keyed by the profile, so switching profiles brings a field showing the
         one now being read rather than the last one's half-typed name. */
      key={profile.id}
      id="chroma-profile-name"
      label="Chroma profile name"
      name={profile.name}
      errorFor={(name) =>
        chromaProfileNameError(palette.profiles, profile.id, name)
      }
      claiming={minted === profile.id}
      /* Invalid input stays in the field while the user is editing, so they can
         see and fix what they typed, but never reaches the Palette: the core
         seam refuses an empty name and one another profile already holds. */
      onRename={(name) =>
        onChange(renameChromaProfile(palette, profile.id, name))
      }
      removable={removable}
      removeLabel={removeLabel(profile.name, removable, readers)}
      onRemove={remove}
    >
      <select
        aria-label="Chroma profile"
        value={profile.id}
        onChange={(event) => pick(event.target.value)}
        className="rounded-md border border-zinc-300 bg-transparent px-2 py-1.5 text-sm dark:border-zinc-700 dark:bg-zinc-900"
      >
        {palette.profiles.map((each) => (
          <option key={each.id} value={each.id}>
            {each.name}
          </option>
        ))}
        <option value={NEW_PROFILE}>New profile…</option>
      </select>
    </NameField>
  );
}

/** Why the profile cannot go, said in the control that would have removed it. */
function removeLabel(
  name: string,
  removable: boolean,
  readers: number,
): string {
  const remove = `Remove chroma profile ${name}`;
  if (removable) return remove;
  if (readers > 1) {
    return `${remove} — unavailable, ${readers} spectrums are using it`;
  }
  return `${remove} — unavailable, the last chroma profile cannot be removed`;
}
