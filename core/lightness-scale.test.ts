import { describe, expect, it } from "vitest";
import {
  draggedLightness,
  ladderTurnsBack,
  markersOf,
  nudgedLightness,
} from "./lightness-scale";
import type { Palette } from "./palette";

const SPECTRUM = { id: "brand", name: "brand", profileId: "p1" };

function ladder(...lightnesses: number[]): Palette {
  return {
    prefix: "color",
    profiles: [{ id: "p1", name: "vibrant" }],
    spectrums: [SPECTRUM],
    rows: lightnesses.map((lightness) => ({
      lightness,
      chromas: { p1: 0.1 },
      stops: { brand: { hue: 264 } },
    })),
  };
}

describe("markersOf", () => {
  it("draws one marker per Row, carrying the Socket it sits at", () => {
    expect(
      markersOf(ladder(95, 60, 25)).map((marker) => marker.socket.number),
    ).toEqual([100, 200, 300]);
  });

  it("places a marker at its Row's true Lightness along the track", () => {
    expect(
      markersOf(ladder(0, 25.5, 100)).map((marker) => marker.position),
    ).toEqual([0, 0.255, 1]);
  });

  it("names the index the marker edits, so a drag reaches the Row", () => {
    expect(markersOf(ladder(95, 60)).map((marker) => marker.index)).toEqual([
      0, 1,
    ]);
  });
});

describe("draggedLightness", () => {
  it("reads a fraction of the track as a Lightness", () => {
    expect(draggedLightness(0)).toBe(0);
    expect(draggedLightness(1)).toBe(100);
  });

  it("snaps to the nearest half percent, which typing is free to sit between", () => {
    expect(draggedLightness(0.6018)).toBe(60);
    expect(draggedLightness(0.6033)).toBe(60.5);
  });

  it("holds a drag past either end of the track at that end", () => {
    expect(draggedLightness(-0.4)).toBe(0);
    expect(draggedLightness(1.7)).toBe(100);
  });
});

describe("nudgedLightness", () => {
  it("steps by half a percent, the step a drag lands on", () => {
    expect(nudgedLightness(60, 1)).toBe(60.5);
    expect(nudgedLightness(60, -1)).toBe(59.5);
  });

  it("brings a typed value onto the grid a drag snaps to", () => {
    expect(nudgedLightness(60.37, 1)).toBe(61);
    expect(nudgedLightness(60.37, -1)).toBe(60);
  });

  it("holds a nudge at the end of the track it reaches", () => {
    expect(nudgedLightness(100, 1)).toBe(100);
    expect(nudgedLightness(0, -1)).toBe(0);
  });
});

describe("ladderTurnsBack", () => {
  it("stays quiet while the ladder darkens all the way down", () => {
    expect(ladderTurnsBack(ladder(95, 60, 25))).toBe(false);
  });

  it("stays quiet while the ladder lightens all the way down", () => {
    expect(ladderTurnsBack(ladder(25, 60, 95))).toBe(false);
  });

  it("stays quiet for a ladder too short to have a direction", () => {
    expect(ladderTurnsBack(ladder(60))).toBe(false);
  });

  it("fires on a step that runs against the ladder", () => {
    expect(ladderTurnsBack(ladder(95, 25, 60))).toBe(true);
  });

  it("fires once however many steps turn back", () => {
    expect(ladderTurnsBack(ladder(95, 25, 60, 10, 40))).toBe(true);
  });

  it("takes the ladder's direction from its first step, whichever way it runs", () => {
    expect(ladderTurnsBack(ladder(25, 60, 40))).toBe(true);
  });

  it("lets two Rows share a Lightness without calling it a turn", () => {
    expect(ladderTurnsBack(ladder(95, 60, 60, 25))).toBe(false);
  });

  it("looks past a shared Lightness to the direction either side of it", () => {
    expect(ladderTurnsBack(ladder(95, 95, 60, 25))).toBe(false);
  });
});
