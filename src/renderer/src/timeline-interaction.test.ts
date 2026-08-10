import {describe, expect, it} from "vitest";
import {chooseMotionDropPhase, frameFromTimelinePointer} from "./timeline-interaction";

describe("timeline interactions", () => {
  it("maps clicks and drags to exact clamped frames", () => {
    expect(frameFromTimelinePointer(100, 100, 600, 150)).toBe(0);
    expect(frameFromTimelinePointer(400, 100, 600, 150)).toBe(75);
    expect(frameFromTimelinePointer(700, 100, 600, 150)).toBe(149);
    expect(frameFromTimelinePointer(900, 100, 600, 150)).toBe(149);
  });

  it("chooses an intuitive supported phase from the drop position", () => {
    expect(chooseMotionDropPhase(0.1, ["enter", "exit"])).toBe("enter");
    expect(chooseMotionDropPhase(0.9, ["enter", "exit"])).toBe("exit");
    expect(chooseMotionDropPhase(0.5, ["enter", "exit"])).toBe("enter");
    expect(chooseMotionDropPhase(0.5, ["loop"])).toBe("loop");
    expect(chooseMotionDropPhase(0.9, [])).toBeNull();
  });
});
