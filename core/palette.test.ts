import { describe, expect, it } from "vitest";
import { socketsOf } from "./palette";
import type { Palette } from "./palette";

const spectrum = { id: "s", name: "brand", profileId: "p1" };

const palette: Palette = {
  prefix: "color",
  profiles: [{ id: "p1", name: "vibrant" }],
  spectrums: [spectrum],
  rows: [
    { lightness: 95, chromas: { p1: 0.02 }, stops: { s: { hue: 250 } } },
    { lightness: 60, chromas: { p1: 0.15 }, stops: { s: { hue: 250 } } },
    { lightness: 20, chromas: { p1: 0.08 }, stops: { s: { hue: 250 } } },
  ],
};

describe("socketsOf", () => {
  it("numbers sockets in multiples of 100 counting up from the first", () => {
    expect(socketsOf(palette).map((s) => s.socket.number)).toEqual([
      100, 200, 300,
    ]);
  });

  it("pairs each socket with the row that occupies it", () => {
    expect(socketsOf(palette).map((s) => s.row.lightness)).toEqual([95, 60, 20]);
  });
});
