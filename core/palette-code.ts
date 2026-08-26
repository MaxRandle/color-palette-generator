/**
 * The Palette code: the whole Palette written as one versioned string, so it
 * can ride in the URL fragment and in localStorage. Only authored Oklch values
 * are written — never a Fallback — so a shared Palette is not permanently
 * flattened to sRGB.
 */

import { CHROMA_MAX, FULL_TURN, LIGHTNESS_MAX } from "./color";
import { prefixError } from "./prefix";
import { spectrumNameError } from "./spectrum";
import type { Palette, Row, Spectrum, Stop } from "./palette";

/**
 * The format's version, first field of every code. A code that opens with
 * anything else was written by a format this build does not know, and is
 * refused rather than guessed at.
 */
const VERSION = "1";

/** Fields of the code. */
const FIELD = "~";

/** Items inside one field: spectrums, and a Row's numbers. */
const ITEM = ",";

/** A Spectrum's id from its name. */
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

function encodeSpectrum(spectrum: Spectrum): string {
  return [spectrum.id, spectrum.name].map(encodeText).join(PAIR);
}

function encodeRow(row: Row, spectrums: readonly Spectrum[]): string {
  const stops = spectrums.flatMap((spectrum) => {
    const stop = row.stops[spectrum.id];
    return [stop.chroma, stop.hue];
  });
  return [row.lightness, ...stops].map(String).join(ITEM);
}

/** The Palette as a code, ready to put in a fragment. */
export function encodePalette(palette: Palette): string {
  return [
    VERSION,
    encodeText(palette.prefix),
    palette.spectrums.map(encodeSpectrum).join(ITEM),
    ...palette.rows.map((row) => encodeRow(row, palette.spectrums)),
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
  if (text.trim() === "") return null;
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
 * A Spectrum the app could have written, read against the ones already decoded.
 * A name is held to the same rule as the field the user types into: it is a
 * fragment of every custom property the Spectrum emits, so a code carrying one
 * that is not a CSS identifier — or one a Spectrum already decoded holds —
 * would load a Palette that emits a broken block. Ids have to be distinct for a
 * plainer reason: two Spectrums sharing one share every Row's Stop.
 */
function decodeSpectrum(field: string, decoded: readonly Spectrum[]): Spectrum | null {
  const parts = field.split(PAIR);
  if (parts.length !== 2) return null;
  const [id, name] = parts.map(decodeText);
  if (id === null || name === null || id === "") return null;
  if (decoded.some((spectrum) => spectrum.id === id)) return null;
  if (spectrumNameError(decoded, id, name) !== null) return null;
  return { id, name };
}

function decodeRow(field: string, spectrums: readonly Spectrum[]): Row | null {
  const numbers = field.split(ITEM);
  if (numbers.length !== 1 + spectrums.length * 2) return null;
  const lightness = decodeBounded(numbers[0], LIGHTNESS_MAX);
  if (lightness === null) return null;
  const stops: Record<string, Stop> = {};
  for (const [at, spectrum] of spectrums.entries()) {
    const chroma = decodeBounded(numbers[at * 2 + 1], CHROMA_MAX);
    const hue = decodeAngle(numbers[at * 2 + 2]);
    if (chroma === null || hue === null) return null;
    stops[spectrum.id] = { chroma, hue };
  }
  return { lightness, stops };
}

/**
 * The Palette a code describes, or null if this build cannot read it.
 *
 * A code is read strictly: anything the app could not have written is refused
 * outright rather than repaired, because a half-read Palette silently loses
 * the work the link was sent to carry. The caller falls back to what it had.
 */
export function decodePalette(code: string): Palette | null {
  const [version, prefix, spectrumField, ...rowFields] = code.split(FIELD);
  if (
    version !== VERSION ||
    prefix === undefined ||
    spectrumField === undefined
  ) {
    return null;
  }
  if (rowFields.length === 0) return null;

  const decodedPrefix = decodeText(prefix);
  // The prefix names every custom property the Palette emits, and a code is
  // as untrusted a source as the field the user types into.
  if (decodedPrefix === null || prefixError(decodedPrefix) !== null)
    return null;

  const spectrums: Spectrum[] = [];
  for (const field of spectrumField.split(ITEM)) {
    const spectrum = decodeSpectrum(field, spectrums);
    if (spectrum === null) return null;
    spectrums.push(spectrum);
  }

  const rows: Row[] = [];
  for (const field of rowFields) {
    const row = decodeRow(field, spectrums);
    if (row === null) return null;
    rows.push(row);
  }

  return { prefix: decodedPrefix, spectrums, rows };
}
