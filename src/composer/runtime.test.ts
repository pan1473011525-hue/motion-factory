import {describe, expect, it} from "vitest";
import {createComposerNode} from "./registry";
import {getComposerMotionStyle} from "./runtime";

describe("composer motion runtime", () => {
  it("evaluates deterministic enter and exit opacity", () => {
    const node = createComposerNode("title", "title-1", 90);
    node.motion.enter = "fade";
    node.motion.exit = "fade";
    expect(getComposerMotionStyle(node, 0, 30, false, 1).opacity).toBe(0);
    expect(getComposerMotionStyle(node, 30, 30, false, 1).opacity).toBe(1);
    expect(getComposerMotionStyle(node, 89, 30, false, 1).opacity).toBe(0);
  });

  it("disables perpetual movement in reduced-motion mode", () => {
    const node = createComposerNode("rectangle", "shape-1", 120);
    node.motion.enter = "none";
    node.motion.exit = "none";
    node.motion.loop = "float";
    expect(getComposerMotionStyle(node, 20, 30, true, 1).translate).toBe("0px 0px");
  });

  it("applies the selected timing curve to a component enter", () => {
    const node = createComposerNode("title", "title-1", 90);
    node.motion.enter = "fade";
    node.motion.exit = "none";
    node.motion.enterEasing = "linear";
    const linearOpacity = Number(getComposerMotionStyle(node, 7, 30, false, 1).opacity);
    node.motion.enterEasing = "quad-in";
    const quadraticOpacity = Number(getComposerMotionStyle(node, 7, 30, false, 1).opacity);
    expect(quadraticOpacity).toBeLessThan(linearOpacity);
  });

  it("uses perceptual interpolation for scale reveals", () => {
    const node = createComposerNode("rectangle", "shape-1", 90);
    node.motion.enter = "scale";
    node.motion.exit = "none";
    node.motion.enterEasing = "linear";
    const style = getComposerMotionStyle(node, 8, 30, false, 1);
    expect(Number(style.scale)).toBeGreaterThan(0.81);
    expect(Number(style.scale)).toBeLessThan(1);
  });
});
