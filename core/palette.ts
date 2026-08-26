/**
 * The palette model, per ADR-0001 and ADR-0006: a Row owns its Lightness and
 * one Chroma per Chroma profile; a Spectrum contributes only Hue, and the
 * Chroma profile it reads.
 */

/** One Spectrum's contribution at one Row: a Hue, and nothing else. */
export type Stop = {
  /** Degrees, 0 to 360. */
  readonly hue: number;
};

/**
 * A named Chroma per Row, which any number of Spectrums may read. Holds no
 * values of its own: the Chroma lives on the Row, keyed by this id, so it
 * travels with the Row when it is dragged, exactly as the Lightness does.
 */
export type ChromaProfile = {
  readonly id: string;
  readonly name: string;
};

/** One named ramp of colors across every Socket. */
export type Spectrum = {
  readonly id: string;
  readonly name: string;
  /** The Chroma profile this Spectrum reads, by its id. */
  readonly profileId: string;
};

/** The unit that occupies a Socket: one Lightness, the Chromas, and the Stops. */
export type Row = {
  /** Percentage, 0 to 100. */
  readonly lightness: number;
  /** Unitless, 0 to 0.5, keyed by Chroma profile id. */
  readonly chromas: Readonly<Record<string, number>>;
  /** Keyed by Spectrum id. */
  readonly stops: Readonly<Record<string, Stop>>;
};

/** A numbered position in the palette's ladder. Owns nothing but its number. */
export type Socket = {
  readonly number: number;
};

export type Palette = {
  /** Names the CSS custom properties: `color` gives `--color-100`. */
  readonly prefix: string;
  /** In the order they were created; a Palette always holds at least one. */
  readonly profiles: readonly ChromaProfile[];
  readonly spectrums: readonly Spectrum[];
  /** In ladder order; index determines the Socket each Row occupies. */
  readonly rows: readonly Row[];
};

/** A Socket together with the Row currently occupying it. */
export type OccupiedSocket = {
  readonly socket: Socket;
  readonly row: Row;
};

/** A Socket's number is a property of its position, not of its occupant. */
function socketNumberAt(index: number): number {
  return (index + 1) * 100;
}

/** The palette's ladder, in order, each Socket paired with its Row. */
export function socketsOf(palette: Palette): OccupiedSocket[] {
  return palette.rows.map((row, index) => ({
    socket: { number: socketNumberAt(index) },
    row,
  }));
}

/**
 * The Chroma profile a Spectrum reads. Every Spectrum reads one the Palette
 * holds — a code naming a profile that is not there is refused, and no edit can
 * leave one behind — so the fall back to the first profile is what a Palette
 * that should not exist renders as, rather than a case with meaning.
 */
export function profileOf(palette: Palette, spectrum: Spectrum): ChromaProfile {
  return (
    palette.profiles.find((profile) => profile.id === spectrum.profileId) ??
    palette.profiles[0]
  );
}

/**
 * The Chroma a Spectrum has at a Row: the Row's own value under whichever
 * Chroma profile the Spectrum reads. The one place the indirection is spelled
 * out, so nothing else has to know a Spectrum holds a profile rather than a
 * Chroma — and it reads the profile through `profileOf`, so the value and the
 * name the ladder heads its column with can never come from different profiles.
 */
export function chromaOf(
  palette: Palette,
  row: Row,
  spectrum: Spectrum,
): number {
  return row.chromas[profileOf(palette, spectrum).id];
}

/** The Spectrums reading one Chroma profile. Deleting is refused while it is more than one. */
export function spectrumsUsing(
  palette: Palette,
  profileId: string,
): readonly Spectrum[] {
  return palette.spectrums.filter(
    (spectrum) => spectrum.profileId === profileId,
  );
}
