import {describe, expect, it} from "vitest";
import {renderToString} from "react-dom/server";
import React from "react";
import {composerComponents, createComposerNode} from "./registry";
import {ComposerInspector} from "../renderer/src/ComposerInspector";

describe("新组件检查器渲染", () => {
  for (const component of composerComponents) {
    if (component.id === "template") continue;
    it(`${component.id} 检查器可渲染且包含字段`, () => {
      const node = createComposerNode(component.id, "test-node", 150, 0);
      let html = "";
      try {
        html = renderToString(
          React.createElement(ComposerInspector, {
            node,
            assets: [],
            projectDurationInFrames: 150,
            view: "basic",
            onViewChange: () => {},
            onChange: () => {},
            onPickMedia: async () => {},
          }),
        );
      } catch (error) {
        throw new Error(`${component.id} 检查器渲染崩溃: ${error instanceof Error ? error.message : String(error)}`);
      }
      // 至少渲染出组件名（图层组）与一个字段 label
      expect(html).toContain(component.name);
      const firstField = component.fields[0];
      if (firstField) expect(html, `${component.id} 缺少字段入口 ${firstField.label}`).toContain(firstField.label);
    });
  }
});
