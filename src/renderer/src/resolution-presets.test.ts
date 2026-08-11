import {describe, expect, it} from "vitest";
import {getCanvasOrientation, getPresetDimensions, getResolutionTier} from "./resolution-presets";

describe("resolution presets", () => {
  it("maps every tier to landscape and portrait dimensions", () => {
    expect(getPresetDimensions("1k", "landscape")).toEqual({width: 1920, height: 1080});
    expect(getPresetDimensions("2k", "portrait")).toEqual({width: 1440, height: 2560});
    expect(getPresetDimensions("4k", "landscape")).toEqual({width: 3840, height: 2160});
  });

  it("recognizes exact presets and keeps custom dimensions custom", () => {
    expect(getResolutionTier(1080, 1920)).toBe("1k");
    expect(getResolutionTier(2560, 1440)).toBe("2k");
    expect(getResolutionTier(1600, 900)).toBeNull();
  });

  it("infers the current orientation", () => {
    expect(getCanvasOrientation(1920, 1080)).toBe("landscape");
    expect(getCanvasOrientation(1080, 1920)).toBe("portrait");
  });
});
