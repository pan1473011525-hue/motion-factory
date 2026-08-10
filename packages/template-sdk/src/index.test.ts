import {describe, expect, it} from "vitest";
import {z} from "zod";
import {
  defineTemplateManifest,
  getFixedEdgesTimeline,
  getLoopFrame,
  getPagination,
  migrateTemplateProps,
  validateTemplateAssets,
  validateTemplateDuration,
} from "./index";

const manifest = defineTemplateManifest({
  id: "test",
  compositionId: "Test",
  version: "2.0.0",
  name: "测试模板",
  category: "data",
  tags: [],
  description: "测试",
  schema: z.object({title: z.string()}),
  defaultProps: {title: "默认"},
  fields: [{key: "title", label: "标题", section: "content", control: "text"}],
  durationMode: "fixed-edges",
  capabilities: {
    alpha: true,
    audio: false,
    mediaSlots: 0,
    minDurationFrames: 60,
    supportedAspectRatios: ["16:9"],
  },
  stylePresets: [],
  migrations: [{from: "1.0.0", to: "2.0.0", migrate: (props) => ({title: String((props as {name?: string}).name ?? "默认")})}],
  preview: {accent: "#fff", label: "T"},
});

describe("template sdk", () => {
  it("migrates and validates props", () => {
    expect(migrateTemplateProps(manifest, "1.0.0", {name: "旧标题"})).toEqual({title: "旧标题"});
  });

  it("validates minimum duration at fractional fps", () => {
    expect(validateTemplateDuration(manifest, 47, 24)).toContain("至少需要 48 帧");
    expect(validateTemplateDuration(manifest, 48, 24)).toBeNull();
  });

  it("keeps fixed edge, loop and pagination behavior seek-safe", () => {
    expect(getFixedEdgesTimeline(5, 100, 10).phase).toBe("intro");
    expect(getFixedEdgesTimeline(50, 100, 10).phase).toBe("hold");
    expect(getFixedEdgesTimeline(95, 100, 10).phase).toBe("outro");
    expect(getLoopFrame(27, 10, 8)).toBe(11);
    expect(getPagination(75, 100, 12, 5)).toMatchObject({page: 2, pageCount: 3});
  });

  it("detects missing required media", () => {
    const mediaManifest = defineTemplateManifest<{title: string; assetId: string}>({
      ...manifest,
      id: "media-test",
      schema: z.object({title: z.string(), assetId: z.string()}),
      defaultProps: {title: "测试", assetId: ""},
      fields: [{key: "assetId", label: "主素材", section: "data", control: "media", accept: ["image"], required: true}],
      stylePresets: [],
      migrations: [],
    });
    expect(validateTemplateAssets(mediaManifest, mediaManifest.defaultProps, [])).toContain("需要选择");
    expect(validateTemplateAssets(mediaManifest, {title: "测试", assetId: "asset-1"}, [{id: "asset-1", path: "/tmp/a.png"}])).toBeNull();
  });
});
