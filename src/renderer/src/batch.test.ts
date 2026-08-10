import {describe, expect, it} from "vitest";
import {createDefaultProject} from "../../shared/default-project";
import {getTemplateManifest} from "../../templates/catalog";
import {buildBatchProjects, formatBatchName, inferBatchMappings} from "./batch";

describe("batch preview and mapping", () => {
  const manifest = getTemplateManifest("stat-counter");
  const project = createDefaultProject("4a857bc1-9b0c-4899-a330-f662907c535d", "2026-08-10T00:00:00.000Z");

  it("infers Chinese labels and renders naming tokens", () => {
    expect(inferBatchMappings(["标题", "数值", "栏目"], manifest)).toEqual({标题: "title", 数值: "value", 栏目: "__skip__"});
    expect(formatBatchName("{{project}}-{{栏目}}-{{index}}", {栏目: "财经"}, 1, "日报")).toBe("日报-财经-002");
  });

  it("builds valid projects while keeping invalid rows visible", () => {
    const result = buildBatchProjects({
      fileName: "data.csv",
      headers: ["标题", "数值"],
      records: [{标题: "增长", 数值: "42"}, {标题: "错误", 数值: "not-a-number"}],
      mappings: {标题: "title", 数值: "value"},
      namingPattern: "{{project}}-{{index}}",
    }, project, manifest);
    expect(result.projects).toHaveLength(1);
    expect(result.projects[0]?.props.value).toBe(42);
    expect(result.errors).toHaveLength(1);
  });
});
