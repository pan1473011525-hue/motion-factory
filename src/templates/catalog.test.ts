import {describe, expect, it} from "vitest";
import {getFrameRate} from "../../packages/project-model/src";
import {validateTemplateDuration} from "../../packages/template-sdk/src";
import {createDefaultProject} from "../shared/default-project";
import {templateCatalog, upgradeProjectTemplate} from "./catalog";

describe("template catalog", () => {
  it("has unique ids and composition ids with valid defaults", () => {
    expect(templateCatalog).toHaveLength(46);
    expect(new Set(templateCatalog.map((template) => template.id)).size).toBe(templateCatalog.length);
    expect(new Set(templateCatalog.map((template) => template.compositionId)).size).toBe(templateCatalog.length);
    for (const template of templateCatalog) {
      expect(() => template.schema.parse(template.defaultProps)).not.toThrow();
      expect(validateTemplateDuration(template, template.capabilities.minDurationFrames, 30)).toBeNull();
      expect(template.stylePresets).toHaveLength(3);
      expect(template.capabilities.supportedAspectRatios).toEqual(["16:9", "9:16", "1:1", "custom"]);
    }
  });

  it("upgrades the P1 stat counter project", () => {
    const project = createDefaultProject("3ce0f817-8aa1-4c1e-9016-e814d09b34df", "2026-08-09T12:00:00.000Z");
    project.template.version = "1.0.0";
    delete project.props.stylePreset;
    const upgraded = upgradeProjectTemplate(project);
    expect(upgraded.template.version).toBe("1.2.0");
    expect(upgraded.props.stylePreset).toBe("editorial");
    expect(getFrameRate(upgraded.canvas.fps)).toBe(30);
  });

  it("enforces text, array and duration boundaries for every template", () => {
    for (const template of templateCatalog) {
      expect(validateTemplateDuration(template, template.capabilities.minDurationFrames - 1, 30)).not.toBeNull();
      if (template.capabilities.maxDurationFrames) {
        expect(validateTemplateDuration(template, template.capabilities.maxDurationFrames + 1, 30)).not.toBeNull();
      }
      for (const field of template.fields) {
        if ((field.control === "text" || field.control === "textarea") && field.maxLength) {
          const overlong = {...template.defaultProps, [field.key]: "界".repeat(field.maxLength + 1)};
          expect(template.schema.safeParse(overlong).success, `${template.id}.${field.key} 应拒绝超长文本`).toBe(false);
        }
        if (field.control === "data-array") {
          const original = Array.isArray(template.defaultProps[field.key])
            ? template.defaultProps[field.key] as unknown[]
            : [];
          const tooMany = Array.from({length: field.maxItems + 1}, (_, index) => original[index % Math.max(1, original.length)] ?? field.newItem);
          expect(template.schema.safeParse({...template.defaultProps, [field.key]: tooMany}).success, `${template.id}.${field.key} 应拒绝过量数据`).toBe(false);
        }
      }
    }
  });

  it("migrates source and media projects to the expanded production schemas", () => {
    const source = templateCatalog.find((template) => template.id === "source-card")!;
    const oldSource = Object.fromEntries(Object.entries(source.defaultProps).filter(([key]) => !["url", "accessDate", "displayMode"].includes(key)));
    const sourceProject = createDefaultProject("3ce0f817-8aa1-4c1e-9016-e814d09b34df", "2026-08-09T12:00:00.000Z");
    sourceProject.template = {id: "source-card", version: "1.0.0"};
    sourceProject.props = oldSource;
    expect(upgradeProjectTemplate(sourceProject).props.displayMode).toBe("short");

    const media = templateCatalog.find((template) => template.id === "media-info")!;
    const expandedKeys = ["mediaFit", "focalX", "focalY", "mediaScale", "mediaRadius", "videoInSeconds"];
    const oldMedia = Object.fromEntries(Object.entries(media.defaultProps).filter(([key]) => !expandedKeys.includes(key)));
    sourceProject.template = {id: "media-info", version: "1.0.0"};
    sourceProject.props = oldMedia;
    expect(upgradeProjectTemplate(sourceProject).props.mediaFit).toBe("cover");
  });
});
