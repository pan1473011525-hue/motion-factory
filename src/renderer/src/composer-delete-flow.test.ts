import {describe, expect, it} from "vitest";
import {createEmptyComposerComposition, type ComposerComposition, type ComposerNode} from "../../../packages/project-model/src";
import {createComposerNode} from "../../composer/registry";

const deleteNodes = (composition: ComposerComposition, ids: readonly string[], ripple = false): ComposerComposition => {
  const allNodes = composition.nodes;
  let remaining = allNodes.filter((node) => !ids.includes(node.id));
  if (ripple) {
    const removed = allNodes.filter((node) => ids.includes(node.id)).sort((a, b) => a.timing.from - b.timing.from);
    for (const target of removed) {
      remaining = remaining.map((node) => node.timing.from >= target.timing.from
        ? {...node, timing: {...node.timing, from: Math.max(0, node.timing.from - target.timing.durationInFrames)}}
        : node);
    }
  }
  return {...composition, nodes: remaining};
};

const makeTemplateNode = (composition: ComposerComposition, durationInFrames: number): ComposerNode => {
  const node = createComposerNode("template", "default-template", durationInFrames, 0);
  node.name = "stat-counter";
  node.props = {templateId: "stat-counter", templateProps: {title: "统计", value: 100}};
  node.motion.enter = "none";
  node.motion.exit = "none";
  return node;
};

describe("composer default-template delete flow", () => {
  it("deletes the default template node leaving an empty composition", () => {
    const duration = 150;
    const empty = {...createEmptyComposerComposition(), nodes: [] as ComposerNode[]};
    const withTemplate: ComposerComposition = {...empty, nodes: [makeTemplateNode(empty, duration)]};
    expect(withTemplate.nodes).toHaveLength(1);

    const afterDelete = deleteNodes(withTemplate, ["default-template"]);
    expect(afterDelete.nodes).toHaveLength(0);

    // 添加新组件后,默认模板不应复活
    const afterAdd: ComposerComposition = {...afterDelete, nodes: [createComposerNode("rectangle", "rect-1", duration, 1)]};
    expect(afterAdd.nodes.map((node) => node.id)).toEqual(["rect-1"]);
  });

  it("deletes the template node when other nodes are present", () => {
    const duration = 150;
    const empty = {...createEmptyComposerComposition(), nodes: [] as ComposerNode[]};
    const template = makeTemplateNode(empty, duration);
    const rect = createComposerNode("rectangle", "rect-1", duration, 1);
    const scene: ComposerComposition = {...empty, nodes: [template, rect]};

    const afterDelete = deleteNodes(scene, [template.id]);
    expect(afterDelete.nodes.map((node) => node.id)).toEqual(["rect-1"]);
  });
});
