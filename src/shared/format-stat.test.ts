import {describe, expect, it} from "vitest";
import {formatStatValue, getCounterValueAtProgress} from "./format-stat";

describe("formatStatValue", () => {
  it("formats decimals deterministically", () => {
    expect(formatStatValue(128.6, 1)).toBe("128.6");
    expect(formatStatValue(1000, 0)).toBe("1,000");
  });
});

describe("getCounterValueAtProgress", () => {
  it("clamps progress to the renderable range", () => {
    expect(getCounterValueAtProgress(200, -1)).toBe(0);
    expect(getCounterValueAtProgress(200, 0.5)).toBe(100);
    expect(getCounterValueAtProgress(200, 2)).toBe(200);
  });
});
