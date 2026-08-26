import { describe, expect, it } from "vitest";
import { chromaProfileNameError, mintChromaProfile } from "./chroma-profile";
import type { ChromaProfile } from "./palette";

const profiles: ChromaProfile[] = [
  { id: "p1", name: "vibrant" },
  { id: "p2", name: "subtle" },
];

describe("chromaProfileNameError", () => {
  it("accepts a name no other profile holds", () => {
    expect(chromaProfileNameError(profiles, "p1", "punchy")).toBeNull();
  });

  it("accepts free text a spectrum name could not hold", () => {
    expect(chromaProfileNameError(profiles, "p1", "Brand accents!")).toBeNull();
  });

  it("accepts a profile's own name unchanged", () => {
    expect(chromaProfileNameError(profiles, "p1", "vibrant")).toBeNull();
  });

  it("refuses a name another profile already holds", () => {
    expect(chromaProfileNameError(profiles, "p1", "subtle")).toBe(
      "Another chroma profile is already called subtle",
    );
  });

  it("refuses a name another profile holds but for surrounding space", () => {
    expect(chromaProfileNameError(profiles, "p1", " subtle ")).toBe(
      "Another chroma profile is already called  subtle ",
    );
  });

  it("refuses an empty name", () => {
    expect(chromaProfileNameError(profiles, "p1", "  ")).toBe(
      "Chroma profile name cannot be empty",
    );
  });
});

describe("mintChromaProfile", () => {
  it("takes the lowest number free as both an id and a name", () => {
    expect(mintChromaProfile(profiles)).toEqual({
      id: "p3",
      name: "profile 3",
    });
  });

  it("takes a number a later profile left free", () => {
    expect(mintChromaProfile([{ id: "p3", name: "vibrant" }])).toEqual({
      id: "p2",
      name: "profile 2",
    });
  });

  it("steps past a number whose name is taken", () => {
    expect(mintChromaProfile([{ id: "x", name: "profile 2" }])).toEqual({
      id: "p3",
      name: "profile 3",
    });
  });
});
