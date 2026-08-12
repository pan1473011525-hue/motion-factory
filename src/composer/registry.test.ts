import {describe, expect, it} from "vitest";
import {createEmptyComposerComposition} from "../../packages/project-model/src";
import {
  composerComponents,
  createComposerNode,
  motionPresets,
  validateComposerComposition,
} from "./registry";

describe("composer registry", () => {
  it("ships a unique base component and motion library", () => {
    expect(composerComponents).toHaveLength(15);
    expect(new Set(composerComponents.map((component) => component.id)).size).toBe(15);
    expect(motionPresets).toHaveLength(16);
    expect(new Set(motionPresets.map((preset) => preset.id)).size).toBe(16);
  });

  it("creates centered frame-based nodes", () => {
    const node = createComposerNode("title", "title-1", 150, 3);
    expect(node.transform.x + node.transform.width / 2).toBeCloseTo(0.5);
    expect(node.transform.y + node.transform.height / 2).toBeCloseTo(0.5);
    expect(node.timing).toEqual({from: 0, durationInFrames: 150});
    expect(node.transform.zIndex).toBe(3);
    expect(node.motion.enterEasing).toBe("smooth-out");
    expect(node.motion.contentEasing).toBe("smooth-in-out");
    expect(node.motion.exitEasing).toBe("smooth-in");
  });

  it("validates node timing and component props", () => {
    const composition = createEmptyComposerComposition();
    composition.nodes.push(createComposerNode("progress", "progress-1", 150));
    expect(validateComposerComposition(composition, [], 150)).toBeNull();
    composition.nodes[0].timing.durationInFrames = 151;
    expect(validateComposerComposition(composition, [], 150)).toContain("超出项目时长");
  });
});
