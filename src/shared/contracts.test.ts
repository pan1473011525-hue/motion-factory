import {describe, expect, it} from "vitest";
import {parameterPresetCollectionSchema} from "./contracts";

describe("parameter preset exchange", () => {
  it("validates a portable preset collection and rejects unknown versions", () => {
    const collection = {
      format: "motioner-presets",
      version: 1,
      exportedAt: "2026-08-10T00:00:00.000Z",
      presets: [{
        id: "3ce0f817-8aa1-4c1e-9016-e814d09b34df",
        name: "新闻栏目",
        templateId: "news-title",
        props: {headline: "标题"},
        canvas: {width: 1920, height: 1080, fps: {numerator: 30, denominator: 1}, durationInFrames: 150, colorSpace: "rec709", transparent: true},
        animation: {speed: 1, reducedMotion: false, edgeFrames: 18},
        exportPresetId: "prores-4444",
      }],
    };
    expect(parameterPresetCollectionSchema.parse(collection).presets).toHaveLength(1);
    expect(parameterPresetCollectionSchema.safeParse({...collection, version: 2}).success).toBe(false);
  });
});
