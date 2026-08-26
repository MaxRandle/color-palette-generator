import { describe, expect, it } from "vitest";
import { mintSpectrum, spectrumNameError } from "./spectrum";
import type { Palette } from "./palette";

const palette: Palette = {
  prefix: "color",
  profiles: [
    { id: "p1", name: "vibrant" },
    { id: "p2", name: "subtle" },
  ],
  spectrums: [
    { id: "brand", name: "brand", profileId: "p1" },
    { id: "s2", name: "accent", profileId: "p2" },
  ],
  rows: [
    {
      lightness: 60,
      chromas: { p1: 0.2, p2: 0.1 },
      stops: { brand: { hue: 264 }, s2: { hue: 30 } },
    },
  ],
};

describe("spectrumNameError", () => {
  it.each(["warm", "warm-grey", "_private", "grey2", "500s", "márca"])(
    "accepts %s, which can name a custom property",
    (name) => {
      expect(spectrumNameError(palette.spectrums, "brand", name)).toBeNull();
    },
  );

  it("rejects an empty name, which would emit --color--100", () => {
    expect(spectrumNameError(palette.spectrums, "brand", "")).toMatch(/empty/i);
    expect(spectrumNameError(palette.spectrums, "brand", "   ")).not.toBeNull();
  });

  it.each([
    ["a space", "warm grey"],
    ["a semicolon", "brand;"],
    ["a closing brace", "brand}"],
    ["a slash", "brand/primary"],
  ])("rejects %s, which would break the declaration", (_name, name) => {
    expect(spectrumNameError(palette.spectrums, "brand", name)).toMatch(/letters/i);
  });

  it("rejects a name another Spectrum already holds, which would emit it twice", () => {
    expect(spectrumNameError(palette.spectrums, "brand", "accent")).toMatch(/already/i);
  });

  it("accepts a Spectrum's own name, so an unchanged name is not an error", () => {
    expect(spectrumNameError(palette.spectrums, "s2", "accent")).toBeNull();
  });
});

describe("mintSpectrum", () => {
  it("mints a short id and takes it as the name too", () => {
    expect(mintSpectrum([palette.spectrums[0]])).toEqual({
      id: "s2",
      name: "s2",
    });
  });

  it("skips an id another Spectrum already holds", () => {
    expect(mintSpectrum(palette.spectrums).id).toBe("s3");
  });

  it("skips a number another Spectrum holds as a name, so the name is free too", () => {
    expect(
      mintSpectrum([{ id: "brand", name: "s2", profileId: "p1" }]),
    ).toEqual({
      id: "s3",
      name: "s3",
    });
  });
});
