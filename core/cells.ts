import { resolve, type ResolvedColor } from "./color";
import {
  socketsOf,
  type OccupiedSocket,
  type Palette,
  type Socket,
  type Spectrum,
} from "./palette";

/** One Spectrum's color at one Socket, resolved and ready to render or export. */
export type PaletteCell = {
  readonly socket: Socket;
  readonly spectrum: Spectrum;
  readonly color: ResolvedColor;
};

/** One Socket's row of the Tile grid: its number, and its Tile in every Spectrum. */
export type TileRow = {
  readonly socket: Socket;
  /** In Spectrum order, so a column is one Spectrum all the way down. */
  readonly cells: readonly PaletteCell[];
};

/**
 * The whole Palette as the Tile grid reads it: a row per Socket, a column per
 * Spectrum. Per ADR-0003 this is the surface where every Spectrum is seen at
 * once, and where ADR-0001's shared ladder becomes visible — a Socket's Tiles
 * are one row, so equal Shade number is equal Lightness on screen rather than
 * only in the model.
 */
export function tileRowsOf(palette: Palette): TileRow[] {
  return socketsOf(palette).map((occupied) => ({
    socket: occupied.socket,
    cells: palette.spectrums.map((spectrum) => cellAt(palette, occupied, spectrum)),
  }));
}

/** One Spectrum's cells, one per Socket, in ladder order. */
export function cellsOf(palette: Palette, spectrum: Spectrum): PaletteCell[] {
  return socketsOf(palette).map((occupied) => cellAt(palette, occupied, spectrum));
}

/**
 * The one place a cell is made, so the grid and a single ramp are the same
 * Tiles read two ways round rather than two resolutions that could drift.
 */
function cellAt(
  palette: Palette,
  { socket, row }: OccupiedSocket,
  spectrum: Spectrum,
): PaletteCell {
  return { socket, spectrum, color: resolve(palette, row, spectrum) };
}
