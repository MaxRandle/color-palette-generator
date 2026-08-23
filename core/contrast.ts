import { wcagContrast } from "culori";

export const BLACK = "#000000";
export const WHITE = "#ffffff";

/** Whichever of black or white reads better on a tile of the given colour. */
export function labelColorFor(tile: string): string {
  return wcagContrast(tile, BLACK) >= wcagContrast(tile, WHITE) ? BLACK : WHITE;
}
