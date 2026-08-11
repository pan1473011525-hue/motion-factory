import {describe, expect, it} from "vitest";
import {findSelectBoundary, moveSelectIndex} from "./select-navigation";

describe("select keyboard navigation", () => {
  const options = [{disabled: true}, {}, {disabled: true}, {}];

  it("finds the first and last enabled option", () => {
    expect(findSelectBoundary(options, "first")).toBe(1);
    expect(findSelectBoundary(options, "last")).toBe(3);
  });

  it("skips disabled options and wraps", () => {
    expect(moveSelectIndex(options, 1, 1)).toBe(3);
    expect(moveSelectIndex(options, 3, 1)).toBe(1);
    expect(moveSelectIndex(options, 1, -1)).toBe(3);
  });
});
