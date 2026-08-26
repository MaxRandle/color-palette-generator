/**
 * The Palette code: the whole Palette written as one versioned string, so it
 * can ride in the URL fragment and in localStorage. Only authored Oklch values
 * are written — never a Fallback — so a shared Palette is not permanently
 * flattened to sRGB.
 */

import { CHROMA_MAX, FULL_TURN, LIGHTNESS_MAX } from "./color";
import { chromaProfileNameError } from "./chroma-profile";
import { prefixError } from "./prefix";
import { spectrumNameError } from "./spectrum";
import type { ChromaProfile, Palette, Row, Spectrum, Stop } from "./palette";

/**
 * The format's version, first field of every code. A code that opens with
 * anything else was written by a format this build does not know, and is
 * refused rather than guessed at.
 */
const VERSION = "2";

/**
 * The format this one replaced, which held a Chroma per Spectrum per Row rather
 * than Chroma profiles. Read and upgraded rather than refused: a code from an
 * older format is known, not unknown, so opening it is a translation and not a
 * guess. See ADR-0005.
 */
const PREVIOUS_VERSION = "1";

/** Fields of the code. */
const FIELD = "~";

/** Items inside one field: profiles, spectrums, and a Row's numbers. */
const ITEM = ",";

/** The parts of one profile or one Spectrum. */
const PAIR = ":";

/**
 * `encodeURIComponent` leaves the delimiters this format uses alone — they are
 * all legal in a fragment — so a name containing one is escaped by hand,
 * leaving text that `decodeURIComponent` reads back exactly.
 */
function encodeText(text: string): string {
  return encodeURIComponent(text).replace(
    /[~,:]/g,
    (character) => `%${character.charCodeAt(0).toString(16).toUpperCase()}`,
  );
}

function encodeProfile(profile: ChromaProfile): string {
  return [profile.id, profile.name].map(encodeText).join(PAIR);
}

function encodeSpectrum(spectrum: Spectrum): string {
  return [spectrum.id, spectrum.name, spectrum.profileId]
    .map(encodeText)
    .join(PAIR);
}

/**
 * A Row's numbers: its Lightness, then a Chroma per profile, then a Hue per
 * Spectrum — each group in the order its field lists them, so the Row is read
 * back against the same two lists that wrote it.
 */
function encodeRow(
  row: Row,
  profiles: readonly ChromaProfile[],
  spectrums: readonly Spectrum[],
): string {
  return [
    row.lightness,
    ...profiles.map((profile) => row.chromas[profile.id]),
    ...spectrums.map((spectrum) => row.stops[spectrum.id].hue),
  ]
    .map(String)
    .join(ITEM);
}

/** The Palette as a code, ready to put in a fragment. */
export function encodePalette(palette: Palette): string {
  return [
    VERSION,
    encodeText(palette.prefix),
    palette.profiles.map(encodeProfile).join(ITEM),
    palette.spectrums.map(encodeSpectrum).join(ITEM),
    ...palette.rows.map((row) =>
      encodeRow(row, palette.profiles, palette.spectrums),
    ),
  ].join(FIELD);
}

function decodeText(field: string): string | null {
  try {
    return decodeURIComponent(field);
  } catch {
    return null;
  }
}

/** A number the app could have written: finite, and inside its authoring range. */
function decodeBounded(text: string, max: number): number | null {
  if (text === undefined || text.trim() === "") return null;
  const value = Number(text);
  if (!Number.isFinite(value) || value < 0 || value > max) return null;
  return value;
}

/** An angle, which the app writes wrapped into a single turn, so 360 is 0. */
function decodeAngle(text: string): number | null {
  const angle = decodeBounded(text, FULL_TURN);
  return angle === null || angle === FULL_TURN ? null : angle;
}

/**
 * A Chroma profile the app could have written, read against the ones already
 * decoded. Its name reaches no CSS, so it is held only to the rule the control
 * that shows it needs — present, and unlike any other profile's. Ids have to be
 * distinct for a plainer reason: two profiles sharing one share every Row's
 * Chroma.
 */
function decodeProfile(
  field: string,
  decoded: readonly ChromaProfile[],
): ChromaProfile | null {
  const parts = field.split(PAIR);
  if (parts.length !== 2) return null;
  const [id, name] = parts.map(decodeText);
  if (id === null || name === null || id === "") return null;
  if (decoded.some((profile) => profile.id === id)) return null;
  if (chromaProfileNameError(decoded, id, name) !== null) return null;
  return { id, name };
}

/**
 * A Spectrum the app could have written, read against the ones already decoded
 * and the profiles the code carries. A name is held to the same rule as the
 * field the user types into: it is a fragment of every custom property the
 * Spectrum emits, so a code carrying one that is not a CSS identifier — or one
 * a Spectrum already decoded holds — would load a Palette that emits a broken
 * block. Ids have to be distinct for a plainer reason: two Spectrums sharing
 * one share every Row's Stop. The profile it reads has to be one the code
 * actually carries, or the Spectrum has no Chroma at any Row.
 */
function decodeSpectrum(
  field: string,
  decoded: readonly Spectrum[],
  profiles: readonly ChromaProfile[],
): Spectrum | null {
  const parts = field.split(PAIR);
  if (parts.length !== 3) return null;
  const [id, name, profileId] = parts.map(decodeText);
  if (id === null || name === null || profileId === null || id === "") {
    return null;
  }
  if (decoded.some((spectrum) => spectrum.id === id)) return null;
  if (spectrumNameError(decoded, id, name) !== null) return null;
  if (!profiles.some((profile) => profile.id === profileId)) return null;
  return { id, name, profileId };
}

function decodeRow(
  field: string,
  profiles: readonly ChromaProfile[],
  spectrums: readonly Spectrum[],
): Row | null {
  const numbers = field.split(ITEM);
  if (numbers.length !== 1 + profiles.length + spectrums.length) return null;
  const lightness = decodeBounded(numbers[0], LIGHTNESS_MAX);
  if (lightness === null) return null;

  const chromas: Record<string, number> = {};
  for (const [at, profile] of profiles.entries()) {
    const chroma = decodeBounded(numbers[at + 1], CHROMA_MAX);
    if (chroma === null) return null;
    chromas[profile.id] = chroma;
  }

  const stops: Record<string, Stop> = {};
  for (const [at, spectrum] of spectrums.entries()) {
    const hue = decodeAngle(numbers[at + 1 + profiles.length]);
    if (hue === null) return null;
    stops[spectrum.id] = { hue };
  }

  return { lightness, chromas, stops };
}

/**
 * The Palette a code describes, or null if this build cannot read it.
 *
 * A code is read strictly: anything the app could not have written is refused
 * outright rather than repaired, because a half-read Palette silently loses
 * the work the link was sent to carry. The caller falls back to what it had.
 */
export function decodePalette(code: string): Palette | null {
  const [version, ...fields] = code.split(FIELD);
  if (version === PREVIOUS_VERSION) return decodePreviousVersion(fields);
  if (version !== VERSION) return null;

  const [prefix, profileField, spectrumField, ...rowFields] = fields;
  if (
    prefix === undefined ||
    profileField === undefined ||
    spectrumField === undefined ||
    rowFields.length === 0
  ) {
    return null;
  }

  const decodedPrefix = decodePrefix(prefix);
  if (decodedPrefix === null) return null;

  const profiles: ChromaProfile[] = [];
  for (const field of profileField.split(ITEM)) {
    const profile = decodeProfile(field, profiles);
    if (profile === null) return null;
    profiles.push(profile);
  }

  const spectrums: Spectrum[] = [];
  for (const field of spectrumField.split(ITEM)) {
    const spectrum = decodeSpectrum(field, spectrums, profiles);
    if (spectrum === null) return null;
    spectrums.push(spectrum);
  }

  const rows: Row[] = [];
  for (const field of rowFields) {
    const row = decodeRow(field, profiles, spectrums);
    if (row === null) return null;
    rows.push(row);
  }

  return { prefix: decodedPrefix, profiles, spectrums, rows };
}

/**
 * The prefix names every custom property the Palette emits, and a code is as
 * untrusted a source as the field the user types into.
 */
function decodePrefix(field: string): string | null {
  const prefix = decodeText(field);
  if (prefix === null || prefixError(prefix) !== null) return null;
  return prefix;
}

/** One version 1 Spectrum, which carried no profile. */
type PreviousSpectrum = Pick<Spectrum, "id" | "name">;

function decodePreviousSpectrum(
  field: string,
  decoded: readonly PreviousSpectrum[],
): PreviousSpectrum | null {
  const parts = field.split(PAIR);
  if (parts.length !== 2) return null;
  const [id, name] = parts.map(decodeText);
  if (id === null || name === null || id === "") return null;
  if (decoded.some((spectrum) => spectrum.id === id)) return null;
  // The name rule reads a full Spectrum, and only ever at its name and id.
  if (spectrumNameError(decoded as Spectrum[], id, name) !== null) return null;
  return { id, name };
}

/**
 * A version 1 Palette: a Chroma and a Hue per Spectrum at every Row. Read
 * exactly as strictly as version 1 read it, so a code that build refused is
 * still refused rather than arriving repaired.
 */
function decodePreviousVersion(fields: readonly string[]): Palette | null {
  const [prefix, spectrumField, ...rowFields] = fields;
  if (
    prefix === undefined ||
    spectrumField === undefined ||
    rowFields.length === 0
  ) {
    return null;
  }

  const decodedPrefix = decodePrefix(prefix);
  if (decodedPrefix === null) return null;

  const spectrums: PreviousSpectrum[] = [];
  for (const field of spectrumField.split(ITEM)) {
    const spectrum = decodePreviousSpectrum(field, spectrums);
    if (spectrum === null) return null;
    spectrums.push(spectrum);
  }

  /** One Chroma column per Spectrum, in Spectrum order, a value per Row. */
  const columns: number[][] = spectrums.map(() => []);
  const skeleton: { lightness: number; stops: Record<string, Stop> }[] = [];

  for (const field of rowFields) {
    const numbers = field.split(ITEM);
    if (numbers.length !== 1 + spectrums.length * 2) return null;
    const lightness = decodeBounded(numbers[0], LIGHTNESS_MAX);
    if (lightness === null) return null;
    const stops: Record<string, Stop> = {};
    for (const [at, spectrum] of spectrums.entries()) {
      const chroma = decodeBounded(numbers[at * 2 + 1], CHROMA_MAX);
      const hue = decodeAngle(numbers[at * 2 + 2]);
      if (chroma === null || hue === null) return null;
      columns[at].push(chroma);
      stops[spectrum.id] = { hue };
    }
    skeleton.push({ lightness, stops });
  }

  return upgrade(decodedPrefix, spectrums, columns, skeleton);
}

/**
 * A version 1 Palette in this build's model. Each Spectrum's Chroma column
 * becomes a Chroma profile named after it, and a column identical to one
 * already minted is that same profile rather than a second copy of it — a
 * version 1 Palette whose Spectrums already shared their Chromas arrives as the
 * single profile it was being maintained as by hand.
 */
function upgrade(
  prefix: string,
  previous: readonly PreviousSpectrum[],
  columns: readonly (readonly number[])[],
  skeleton: readonly { lightness: number; stops: Record<string, Stop> }[],
): Palette {
  const profiles: ChromaProfile[] = [];
  /** The chroma column each minted profile stands for, by profile id. */
  const minted = new Map<string, readonly number[]>();

  const spectrums = previous.map((spectrum, at) => {
    const column = columns[at];
    const same = profiles.find((profile) =>
      sameColumn(minted.get(profile.id) ?? [], column),
    );
    if (same !== undefined) {
      return { ...spectrum, profileId: same.id };
    }
    const profile = { id: spectrum.id, name: spectrum.name };
    profiles.push(profile);
    minted.set(profile.id, column);
    return { ...spectrum, profileId: profile.id };
  });

  const rows = skeleton.map((row, index) => ({
    lightness: row.lightness,
    chromas: Object.fromEntries(
      profiles.map((profile) => [
        profile.id,
        (minted.get(profile.id) ?? [])[index],
      ]),
    ),
    stops: row.stops,
  }));

  return { prefix, profiles, spectrums, rows };
}

function sameColumn(one: readonly number[], other: readonly number[]): boolean {
  return (
    one.length === other.length &&
    one.every((chroma, at) => chroma === other[at])
  );
}
