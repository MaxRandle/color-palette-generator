"use client";

import { useEffect, useRef } from "react";
import { useDraft } from "./use-draft";
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

const NAME_ERROR = "chroma-profile-name-error";

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
 * Picking and editing are one control because they are one thing, per ADR-0005:
 * the ladder shows the Active Spectrum's profile, so choosing a profile to look
 * at is choosing the profile the Spectrum reads. A profile no Spectrum reads is
 * therefore reachable only by assigning it, which is what stops orphans
 * accumulating out of sight.
 *
 * It stands beside the Spectrum name, and is built the same way — a field and a
 * remove button — because it is the Spectrum's other property. Removing is
 * refused while a second Spectrum reads the profile: that edit would recolor a
 * Spectrum the user is not looking at, and cannot be undone from the values
 * left behind. The button says so rather than disappearing.
 */
export function ChromaProfileField({
  palette,
  onChange,
  spectrum,
}: ChromaProfileFieldProps) {
  const profile = profileOf(palette, spectrum);
  const draft = useDraft(profile.name);
  const error = chromaProfileNameError(palette.profiles, profile.id, draft.text);
  const removable = canRemoveChromaProfile(palette, profile.id);
  const readers = spectrumsUsing(palette, profile.id).length;
  const nameField = useRef<HTMLInputElement>(null);
  /** Set by `add`, so the field is taken over once it is showing the new name. */
  const naming = useRef(false);

  // After the render, not during `add`: the field is one input shared by every
  // profile, so selecting its text before it has been retitled would select the
  // name of the profile that was copied.
  useEffect(() => {
    if (!naming.current) return;
    naming.current = false;
    nameField.current?.focus();
    nameField.current?.select();
  });

  /**
   * The new profile is a verbatim copy of the one the Spectrum was reading, so
   * nothing changes color and its name is the only thing worth typing first.
   */
  function add(): void {
    onChange(addChromaProfile(palette, spectrum.id));
    draft.reset();
    naming.current = true;
  }

  function pick(value: string): void {
    if (value === NEW_PROFILE) {
      add();
      return;
    }
    onChange(setSpectrumProfile(palette, spectrum.id, value));
    draft.reset();
  }

  function remove(): void {
    if (!removable) return;
    onChange(removeChromaProfile(palette, profile.id));
    draft.reset();
  }

  /**
   * Invalid input stays in the field while the user is editing, so they can see
   * and fix what they typed, but never reaches the Palette: the core seam
   * refuses an empty name and one another profile already holds, and the field
   * falls back to the last accepted name on blur.
   */
  function handleName(next: string): void {
    draft.type(next);
    onChange(renameChromaProfile(palette, profile.id, next));
  }

  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor="chroma-profile" className="text-sm font-medium">
        Chroma profile
      </label>
      <div className="flex items-center gap-2">
        <select
          id="chroma-profile"
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
        <input
          ref={nameField}
          type="text"
          value={draft.text}
          aria-label="Chroma profile name"
          onChange={(event) => handleName(event.target.value)}
          onBlur={draft.reset}
          aria-invalid={error !== null}
          aria-describedby={error ? NAME_ERROR : undefined}
          className="w-40 rounded-md border border-zinc-300 bg-transparent px-2 py-1.5 text-sm aria-invalid:border-red-500 dark:border-zinc-700"
        />
        {/* aria-disabled rather than disabled: the button stays focusable, so
            the reason a shared profile cannot go is reachable by keyboard. */}
        <button
          type="button"
          aria-disabled={!removable}
          aria-label={removeLabel(profile.name, removable, readers)}
          onClick={remove}
          className="rounded-md border border-zinc-300 px-3 py-1.5 text-sm text-zinc-600 hover:bg-zinc-100 aria-disabled:cursor-not-allowed aria-disabled:opacity-40 aria-disabled:hover:bg-transparent dark:border-zinc-700 dark:text-zinc-400 dark:hover:bg-zinc-800"
        >
          <span aria-hidden>&times;</span>
        </button>
      </div>
      {/* Announced as it appears: the field is focused while the error changes. */}
      <p
        id={NAME_ERROR}
        role="alert"
        className="min-h-5 text-sm text-red-600 dark:text-red-400"
      >
        {error}
      </p>
    </div>
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
