import { resolve, type ResolvedColor } from "./color";
import { socketsOf, type Palette, type Socket, type Spectrum } from "./palette";

/** One Spectrum's colour at one Socket, resolved and ready to render or export. */
export type RenderedStop = {
  readonly socket: Socket;
  readonly spectrum: Spectrum;
  readonly color: ResolvedColor;
};

/** Every Spectrum's colour at every Socket, Spectrum by Spectrum, in ladder order. */
export function renderPalette(palette: Palette): RenderedStop[] {
  return palette.spectrums.flatMap((spectrum) =>
    socketsOf(palette).map(({ socket, row }) => ({
      socket,
      spectrum,
      color: resolve(row, spectrum),
    })),
  );
}
