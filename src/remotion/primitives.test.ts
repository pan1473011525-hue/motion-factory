import {describe, expect, it} from "vitest";
import {getMotionTheme} from "./primitives";

describe("template appearance theme", () => {
  it("preserves the original template theme when no surface is selected", () => {
    expect(getMotionTheme("editorial", "#47A7FF", {surfaceColor: null, surfaceOpacity: 1, surfaceTone: "auto"}).surface).toBe("rgba(12,18,25,0.94)");
  });

  it("uses dark foreground tokens on a light custom surface", () => {
    const theme = getMotionTheme("editorial", "#47A7FF", {surfaceColor: "#F2F3F5", surfaceOpacity: 0.5, surfaceTone: "auto"});
    expect(theme.surface).toBe("rgba(242,243,245,0.5)");
    expect(theme.ink).toBe("#111418");
  });

  it("keeps light foreground tokens on a dark custom surface", () => {
    const theme = getMotionTheme("minimal", "#47A7FF", {surfaceColor: "#101A2A", surfaceOpacity: 0.8, surfaceTone: "auto"});
    expect(theme.surface).toBe("rgba(16,26,42,0.8)");
    expect(theme.ink).toBe("#F7F9FB");
  });
});
