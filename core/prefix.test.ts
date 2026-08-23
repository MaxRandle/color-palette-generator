import { describe, expect, it } from "vitest";
import { prefixError } from "./prefix";

describe("prefixError", () => {
  // `500s` is in the list deliberately: a custom property name is `--` plus an
  // ident sequence, so a leading digit is legal here as it would not be in a
  // class selector.
  it.each(["color", "brand", "my-brand", "_private", "brand2", "500s", "márca"])(
    "accepts %s",
    (prefix) => {
      expect(prefixError(prefix)).toBeNull();
    },
  );

  it("rejects an empty prefix, which would emit --100", () => {
    expect(prefixError("")).toMatch(/empty/i);
    expect(prefixError("   ")).not.toBeNull();
  });

  it.each([
    ["a space", "my brand"],
    ["a semicolon", "brand;"],
    ["a closing brace", "brand}"],
    ["a colon", "brand:"],
    ["a backslash", "brand\\"],
    ["a quote", 'brand"'],
    ["a newline", "brand\n"],
  ])("rejects %s, which would break the declaration", (_name, prefix) => {
    expect(prefixError(prefix)).toMatch(/letters/i);
  });
});
