import {describe, expect, it} from "vitest";
import {composerEasingPresets, getComposerEasingFunction} from "./easing";

describe("composer easing presets", () => {
  it("ships unique presets with exact endpoints", () => {
    expect(composerEasingPresets).toHaveLength(11);
    expect(new Set(composerEasingPresets.map((preset) => preset.id)).size).toBe(11);
    for (const preset of composerEasingPresets) {
      const easing = getComposerEasingFunction(preset.id);
      expect(easing(0)).toBeCloseTo(0, 6);
      expect(easing(1)).toBeCloseTo(1, 6);
    }
  });

  it("distinguishes quadratic enter and exit timing", () => {
    expect(getComposerEasingFunction("quad-in")(0.5)).toBeCloseTo(0.25, 6);
    expect(getComposerEasingFunction("quad-out")(0.5)).toBeCloseTo(0.75, 6);
  });

  it("keeps the snappy spring as an overshooting emphasis curve", () => {
    const easing = getComposerEasingFunction("spring-snappy");
    const maximum = Math.max(...Array.from({length: 101}, (_, index) => easing(index / 100)));
    expect(maximum).toBeGreaterThan(1.01);
  });
});
