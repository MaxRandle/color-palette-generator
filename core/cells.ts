import { resolve, type ResolvedColor } from "./color";
import { socketsOf, type Palette, type Socket, type Spectrum } from "./palette";

/** One Spectrum's color at one Socket, resolved and ready to render or export. */
export type PaletteCell = {
  readonly socket: Socket;
  readonly spectrum: Spectrum;
  readonly color: ResolvedColor;
};

/** One Spectrum's cells, one per Socket, in ladder order. */
export function cellsOf(palette: Palette, spectrum: Spectrum): PaletteCell[] {
  return socketsOf(palette).map(({ socket, row }) => ({
    socket,
    spectrum,
    color: resolve(row, spectrum),
  }));
}
