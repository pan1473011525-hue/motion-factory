import {describe, expect, it} from "vitest";
import {chooseMotionDropPhase, frameFromTimelinePointer, motionDurationFromBoundaryFrame, snapFrame} from "./timeline-interaction";

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

  it("snaps frames to the nearest target within tolerance", () => {
    const targets = [0, 30, 90, 149];
    expect(snapFrame(28, targets)).toEqual({frame: 30, snapped: true});
    expect(snapFrame(91, targets)).toEqual({frame: 90, snapped: true});
    expect(snapFrame(37, targets)).toEqual({frame: 37, snapped: false});
    expect(snapFrame(0, targets)).toEqual({frame: 0, snapped: true});
    expect(snapFrame(12, [])).toEqual({frame: 12, snapped: false});
  });

  it("respects a custom tolerance", () => {
    expect(snapFrame(25, [30], 2)).toEqual({frame: 25, snapped: false});
    expect(snapFrame(25, [30], 10)).toEqual({frame: 30, snapped: true});
  });

  it("maps draggable motion boundaries to existing duration fields", () => {
    expect(motionDurationFromBoundaryFrame("enter-end", 42, 30, 90)).toBe(12);
    expect(motionDurationFromBoundaryFrame("exit-start", 102, 30, 90)).toBe(18);
    expect(motionDurationFromBoundaryFrame("enter-end", 5, 30, 90)).toBe(1);
    expect(motionDurationFromBoundaryFrame("exit-start", 5, 30, 90)).toBe(90);
  });
});
