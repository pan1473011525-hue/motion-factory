import {readFileSync} from "node:fs";
import {describe, expect, it} from "vitest";
import {createTemplateFiles, registryInsertions, replaceRequiredMarker, toPascalCase, validateTemplateId} from "./template-generator-core.mjs";

describe("template scaffold", () => {
  it("generates deterministic manifest, component and registry snippets", () => {
    expect(toPascalCase("audience-growth")).toBe("AudienceGrowth");
    const files = createTemplateFiles({id: "audience-growth", name: "受众增长"});
    expect(files.manifest).toContain('id: "audience-growth"');
    expect(files.component).toContain("export const AudienceGrowth");
    expect(registryInsertions({id: "audience-growth", componentName: files.componentName, manifestName: files.manifestName}).runtimeItem).toContain("AudienceGrowth");
  });

  it("rejects unsafe identifiers", () => {
    expect(() => validateTemplateId("../bad")).toThrow();
  });

  it("keeps required registration markers in the composer-capable runtime definition file", () => {
    const definitions = readFileSync(new URL("../src/templates/definitions.tsx", import.meta.url), "utf8");
    expect(definitions).toContain("// motioner-scaffold:component-imports");
    expect(definitions).toContain("// motioner-scaffold:manifest-imports");
    expect(definitions).toContain("// motioner-scaffold:runtime-items");
    expect(replaceRequiredMarker("before MARK after", "MARK", "insert")).toBe("before insert after");
    expect(() => replaceRequiredMarker("missing", "MARK", "insert")).toThrow("模板注册标记不存在");
  });
});
