import { describe, expect, it } from "vitest";
import { decodePalette, encodePalette } from "./palette-code";
import { resolve } from "./color";
import type { Palette } from "./palette";

const palette: Palette = {
  prefix: "color",
  profiles: [{ id: "p1", name: "vibrant" }],
  spectrums: [{ id: "brand", name: "brand", profileId: "p1" }],
  rows: [
    { lightness: 95, chromas: { p1: 0.02 }, stops: { brand: { hue: 264 } } },
    { lightness: 60, chromas: { p1: 0.2 }, stops: { brand: { hue: 264 } } },
    { lightness: 25, chromas: { p1: 0.12 }, stops: { brand: { hue: 264 } } },
  ],
};

describe("encodePalette / decodePalette", () => {
  it("round-trips a Palette, prefix included", () => {
    expect(decodePalette(encodePalette(palette))).toEqual(palette);
  });
});

describe("the version marker", () => {
  it("opens every code, so today's links can be recognised tomorrow", () => {
    expect(encodePalette(palette)).toMatch(/^2~/);
  });

  it("refuses a code from a format this build does not know", () => {
    const fromTheFuture = encodePalette(palette).replace(/^2~/, "3~");
    expect(decodePalette(fromTheFuture)).toBeNull();
  });
});

describe("a code that is not a palette", () => {
  it.each([
    ["empty", ""],
    ["not a code at all", "hello world"],
    ["missing its Rows", "2~color~p1:vibrant~brand:brand:p1"],
    ["a Row short of its numbers", "2~color~p1:vibrant~brand:brand:p1~95,0.02"],
    [
      "a Row whose numbers are not numbers",
      "2~color~p1:vibrant~brand:brand:p1~95,red,264",
    ],
    [
      "an empty prefix, which would emit --100",
      "2~~p1:vibrant~brand:brand:p1~95,0.02,264",
    ],
    [
      "a prefix that would break the declaration",
      "2~my%20brand~p1:vibrant~b:b:p1~95,0.02,264",
    ],
    ["a Lightness past 100%", "2~color~p1:vibrant~brand:brand:p1~140,0.02,264"],
    [
      "a Chroma past the authoring ceiling",
      "2~color~p1:vibrant~brand:brand:p1~95,0.8,264",
    ],
    [
      "a Hue outside a single turn",
      "2~color~p1:vibrant~brand:brand:p1~95,0.02,400",
    ],
    ["a Spectrum with no id", "2~color~p1:vibrant~:brand:p1~95,0.02,264"],
    [
      "a Spectrum with no name, which would emit --color--100",
      "2~color~p1:vibrant~brand::p1~95,0.02,264",
    ],
    [
      "a Spectrum name that would break the declaration",
      "2~color~p1:vibrant~brand:warm%20grey,s2:accent:p1~95,0.02,264,30",
    ],
    [
      "two Spectrums sharing a name, one of which would overwrite the other",
      "2~color~p1:vibrant~brand:warm:p1,s2:warm:p1~95,0.02,264,30",
    ],
    [
      "two Spectrums sharing an id, whose Stops would collide",
      "2~color~p1:vibrant~brand:warm:p1,brand:cool:p1~95,0.02,264,30",
    ],
    [
      "a Spectrum reading a profile the code does not carry",
      "2~color~p1:vibrant~brand:brand:nope~95,0.02,264",
    ],
    ["a code with no profiles at all", "2~color~~brand:brand:p1~95,0.02,264"],
    [
      "a profile with no id",
      "2~color~:vibrant~brand:brand:p1~95,0.02,264",
    ],
    [
      "a profile with an empty name, which no control could show",
      "2~color~p1:~brand:brand:p1~95,0.02,264",
    ],
    [
      "two profiles sharing an id, whose Chromas would collide",
      "2~color~p1:vibrant,p1:subtle~brand:brand:p1~95,0.02,0.01,264",
    ],
    [
      "two profiles sharing a name, which no control could tell apart",
      "2~color~p1:vibrant,p2:vibrant~brand:brand:p1~95,0.02,0.01,264",
    ],
  ])("refuses one %s", (_name, code) => {
    expect(decodePalette(code)).toBeNull();
  });
});

describe("what a code carries", () => {
  it("stores the authored Chroma of a Stop outside the sRGB region", () => {
    const outside: Palette = {
      ...palette,
      rows: [
        { lightness: 95, chromas: { p1: 0.4 }, stops: { brand: { hue: 264 } } },
      ],
    };
    expect(resolve(outside.rows[0], outside.spectrums[0]).fellBack).toBe(true);
    expect(decodePalette(encodePalette(outside))?.rows[0]).toEqual({
      lightness: 95,
      chromas: { p1: 0.4 },
      stops: { brand: { hue: 264 } },
    });
  });

  it("round-trips a prefix, an id and a name that need escaping", () => {
    const awkward: Palette = {
      ...palette,
      prefix: "márca-tone",
      profiles: [{ id: "p~1", name: "Brand accents, subtle" }],
      spectrums: [{ id: "a~b", name: "márca", profileId: "p~1" }],
      rows: [
        { lightness: 50, chromas: { "p~1": 0.1 }, stops: { "a~b": { hue: 30 } } },
      ],
    };
    expect(decodePalette(encodePalette(awkward))).toEqual(awkward);
  });

  it("round-trips several Spectrums sharing one profile", () => {
    const two: Palette = {
      ...palette,
      spectrums: [
        { id: "brand", name: "brand", profileId: "p1" },
        { id: "accent", name: "accent", profileId: "p1" },
      ],
      rows: [
        {
          lightness: 60,
          chromas: { p1: 0.2 },
          stops: { brand: { hue: 264 }, accent: { hue: 30 } },
        },
      ],
    };
    expect(decodePalette(encodePalette(two))).toEqual(two);
  });

  it("round-trips several profiles, each keeping its own Chroma", () => {
    const two: Palette = {
      ...palette,
      profiles: [
        { id: "p1", name: "vibrant" },
        { id: "p2", name: "neutral" },
      ],
      spectrums: [
        { id: "brand", name: "brand", profileId: "p1" },
        { id: "gray", name: "gray", profileId: "p2" },
      ],
      rows: [
        {
          lightness: 60,
          chromas: { p1: 0.2, p2: 0 },
          stops: { brand: { hue: 264 }, gray: { hue: 264 } },
        },
      ],
    };
    expect(decodePalette(encodePalette(two))).toEqual(two);
  });
});

/**
 * Version 1 held a Chroma per Spectrum per Row, which is exactly one Chroma
 * profile per Spectrum. Reading one is a translation rather than a guess, so a
 * link shared before this build still opens the Palette it was sent to carry.
 */
describe("a version 1 code", () => {
  it("gives each Spectrum a profile of its own, named after it", () => {
    const v1 = "1~color~brand:brand,accent:accent~95,0.02,264,0.01,30~60,0.2,264,0.06,30";
    expect(decodePalette(v1)).toEqual({
      prefix: "color",
      profiles: [
        { id: "brand", name: "brand" },
        { id: "accent", name: "accent" },
      ],
      spectrums: [
        { id: "brand", name: "brand", profileId: "brand" },
        { id: "accent", name: "accent", profileId: "accent" },
      ],
      rows: [
        {
          lightness: 95,
          chromas: { brand: 0.02, accent: 0.01 },
          stops: { brand: { hue: 264 }, accent: { hue: 30 } },
        },
        {
          lightness: 60,
          chromas: { brand: 0.2, accent: 0.06 },
          stops: { brand: { hue: 264 }, accent: { hue: 30 } },
        },
      ],
    });
  });

  it("collapses Spectrums that already shared their Chromas onto one profile", () => {
    const v1 = "1~color~brand:brand,accent:accent~95,0.02,264,0.02,30~60,0.2,264,0.2,30";
    const decoded = decodePalette(v1);
    expect(decoded?.profiles).toEqual([{ id: "brand", name: "brand" }]);
    expect(decoded?.spectrums.map((s) => s.profileId)).toEqual([
      "brand",
      "brand",
    ]);
    expect(decoded?.rows[0].chromas).toEqual({ brand: 0.02 });
  });

  it("refuses a version 1 code the version 1 build would have refused", () => {
    expect(decodePalette("1~color~brand:brand~140,0.02,264")).toBeNull();
  });
});
