import {describe, expect, it} from "vitest";
import {composerComponents} from "./registry";

describe("组件默认参数校验", () => {
  it("所有组件 defaultProps 都能通过 schema.parse", () => {
    for (const component of composerComponents) {
      const result = component.schema.safeParse(component.defaultProps);
      expect(result.success, `${component.id} defaultProps 未通过 schema: ${JSON.stringify(result.error?.issues ?? []).slice(0, 300)}`).toBe(true);
    }
  });

  it("data-array 字段的 defaultProps 值必须是数组", () => {
    for (const component of composerComponents) {
      for (const field of component.fields) {
        if (field.control === "data-array") {
          expect(Array.isArray(component.defaultProps[field.key]), `${component.id}.${field.key} 声明 data-array 但 defaultProps 不是数组`).toBe(true);
        }
      }
    }
  });
});
