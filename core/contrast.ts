import { wcagContrast } from "culori";

const BLACK = "#000000";
const WHITE = "#ffffff";

/** Whichever of black or white reads better on a tile of the given color. */
export function labelColorFor(tile: string): string {
  return wcagContrast(tile, BLACK) >= wcagContrast(tile, WHITE) ? BLACK : WHITE;
}
