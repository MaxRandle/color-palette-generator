/**
 * The palette model, per ADR-0001: a Row owns its Lightness and holds one Stop
 * per Spectrum; a Spectrum contributes only Chroma and Hue.
 */

/** One Spectrum's contribution at one Row: Chroma and Hue, never Lightness. */
export type Stop = {
  /** Unitless, 0 to 0.35. */
  readonly chroma: number;
  /** Degrees, 0 to 360. */
  readonly hue: number;
};

/** One named ramp of colors across every Socket. */
export type Spectrum = {
  readonly id: string;
  readonly name: string;
};

/** The unit that occupies a Socket: one Lightness plus one Stop per Spectrum. */
export type Row = {
  /** Percentage, 0 to 100. */
  readonly lightness: number;
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
