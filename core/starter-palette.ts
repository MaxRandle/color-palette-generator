import type { Palette } from "./palette";

const BRAND = { id: "brand", name: "brand" };

/** The three-Row palette the tool opens with. Every Stop is inside the sRGB region. */
export const STARTER_PALETTE: Palette = {
  prefix: "color",
  spectrums: [BRAND],
  rows: [
    { lightness: 95, stops: { brand: { chroma: 0.02, hue: 264 } } },
    { lightness: 60, stops: { brand: { chroma: 0.2, hue: 264 } } },
    { lightness: 25, stops: { brand: { chroma: 0.12, hue: 264 } } },
  ],
};
