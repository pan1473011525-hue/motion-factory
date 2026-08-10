import {describe, expect, it} from "vitest";
import {createMotionProject, motionProjectSchema} from "../../packages/project-model/src";
import {EXPORT_PRESETS, getExportPreset} from "./export-presets";

describe("export presets", () => {
  it("exposes four distinct production outputs", () => {
    expect(EXPORT_PRESETS.map((preset) => preset.id)).toEqual([
      "prores-4444",
      "prores-4444-xq",
      "png-sequence",
      "h264-review",
    ]);
    expect(getExportPreset("png-sequence").kind).toBe("image-sequence");
    expect(getExportPreset("h264-review").alpha).toBe(false);
  });

  it("rejects unknown presets when opening a project", () => {
    const project = createMotionProject({
      id: "27af101a-262b-4e1c-a345-d95cd831ca48",
      now: "2026-08-09T12:00:00.000Z",
      templateId: "stat-counter",
      templateVersion: "1.1.0",
      props: {},
    });
    expect(motionProjectSchema.safeParse({...project, exportPresetId: "made-up"}).success).toBe(false);
  });
});
