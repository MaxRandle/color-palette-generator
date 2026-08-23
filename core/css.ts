import { renderPalette, type RenderedStop } from "./render";
import type { Palette } from "./palette";

/**
 * `--color-100` for a single-Spectrum palette; once there is more than one
 * Spectrum the name has to say which, so `--color-brand-100`.
 */
function customPropertyName(palette: Palette, rendered: RenderedStop): string {
  const segments = [palette.prefix];
  if (palette.spectrums.length > 1) {
    segments.push(rendered.spectrum.name);
  }
  segments.push(String(rendered.socket.number));
  return `--${segments.join("-")}`;
}

/** Chroma as authored and as fallen back, at the precision worth reading. */
function fallbackComment({ color }: RenderedStop): string {
  if (!color.fellBack) return "";
  const reducedTo = Number(color.rendered.chroma.toFixed(3));
  return ` /* fallback: chroma ${color.authored.chroma} reduced to ${reducedTo} */`;
}

/** The palette as a block of CSS custom properties, one line per Socket per Spectrum. */
export function formatCss(palette: Palette): string {
  return renderPalette(palette)
    .map(
      (rendered) =>
        `${customPropertyName(palette, rendered)}: ${rendered.color.hex};${fallbackComment(rendered)}`,
    )
    .join("\n");
}
