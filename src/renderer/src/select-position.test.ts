import {describe, expect, it} from "vitest";
import {getSelectMenuGeometry} from "./select-position";

describe("getSelectMenuGeometry", () => {
  it("centers a wider menu below its trigger", () => {
    expect(getSelectMenuGeometry({triggerLeft: 300, triggerBottom: 50, triggerWidth: 80, contentWidth: 160, viewportWidth: 1000, viewportHeight: 700})).toEqual({
      top: 55,
      left: 260,
      width: 160,
      maxHeight: 637,
    });
  });

  it("clamps the menu inside the viewport", () => {
    const geometry = getSelectMenuGeometry({triggerLeft: 950, triggerBottom: 680, triggerWidth: 80, contentWidth: 200, viewportWidth: 1000, viewportHeight: 700});
    expect(geometry.left).toBe(792);
    expect(geometry.maxHeight).toBe(40);
  });
});
