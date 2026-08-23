import { describe, expect, it } from "vitest";
import { labelColorFor } from "./contrast";

describe("labelColorFor", () => {
  // Published WCAG contrast ratios against white / black:
  // white 1.00 / 21.00, black 21.00 / 1.00, red 4.00 / 5.25, blue 8.59 / 2.44.
  it.each([
    ["white", "#ffffff", "#000000"],
    ["black", "#000000", "#ffffff"],
    ["red", "#ff0000", "#000000"],
    ["blue", "#0000ff", "#ffffff"],
  ])("labels a %s tile with the better contrasting of black and white", (_name, tile, label) => {
    expect(labelColorFor(tile)).toBe(label);
  });
});
