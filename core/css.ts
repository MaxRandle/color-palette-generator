import { cellsOf, type PaletteCell } from "./cells";
import type { Palette } from "./palette";

/**
 * `--color-100` for a single-Spectrum palette; once there is more than one
 * Spectrum the name has to say which, so `--color-brand-100`.
 */
function customPropertyName(palette: Palette, cell: PaletteCell): string {
  const segments = [palette.prefix];
  if (palette.spectrums.length > 1) {
    segments.push(cell.spectrum.name);
  }
  segments.push(String(cell.socket.number));
  return `--${segments.join("-")}`;
}

/** Chroma as authored and as fallen back, at the precision worth reading. */
function fallbackComment({ color }: PaletteCell): string {
  if (!color.fellBack) return "";
  const authored = round(color.authored.chroma);
  const reducedTo = round(color.rendered.chroma);
  return ` /* fallback: chroma ${authored} reduced to ${reducedTo} */`;
}

function round(chroma: number): number {
  return Number(chroma.toFixed(3));
}

/** The palette as a block of CSS custom properties, one line per Socket per Spectrum. */
export function formatCss(palette: Palette): string {
  return palette.spectrums
    .flatMap((spectrum) => cellsOf(palette, spectrum))
    .map(
      (cell) =>
        `${customPropertyName(palette, cell)}: ${cell.color.hex};${fallbackComment(cell)}`,
    )
    .join("\n");
}
