import type { Palette } from "./palette";

/**
 * The Chroma profiles the tool opens with: the three a Palette is most likely
 * to want at once, per ADR-0006. Ordinary profiles, editable and removable like
 * any other — they are defaults, not built-ins.
 */
const VIBRANT = { id: "p1", name: "vibrant" };
const SUBTLE = { id: "p2", name: "subtle" };
const NEUTRAL = { id: "p3", name: "neutral" };

const BRAND = { id: "brand", name: "brand", profileId: VIBRANT.id };

/** The three-Row palette the tool opens with. Every Stop is inside the sRGB region. */
export const STARTER_PALETTE: Palette = {
  prefix: "color",
  profiles: [VIBRANT, SUBTLE, NEUTRAL],
  spectrums: [BRAND],
  rows: [
    { lightness: 95, chromas: { p1: 0.02, p2: 0.01, p3: 0 }, stops: { brand: { hue: 264 } } },
    { lightness: 60, chromas: { p1: 0.2, p2: 0.06, p3: 0 }, stops: { brand: { hue: 264 } } },
    { lightness: 25, chromas: { p1: 0.12, p2: 0.04, p3: 0 }, stops: { brand: { hue: 264 } } },
  ],
};
