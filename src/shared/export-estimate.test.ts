import {describe, expect, it} from "vitest";
import {createMotionProject} from "../../packages/project-model/src";
import {estimateExportBytes, formatBytes} from "./export-estimate";

describe("export size estimate", () => {
  const project = createMotionProject({
    id: "27af101a-262b-4e1c-a345-d95cd831ca48",
    now: "2026-08-09T12:00:00.000Z",
    templateId: "stat-counter",
    templateVersion: "1.1.0",
    props: {},
  });

  it("orders presets by their expected delivery size", () => {
    const h264 = estimateExportBytes(project, "h264-review");
    const prores = estimateExportBytes(project, "prores-4444");
    const xq = estimateExportBytes(project, "prores-4444-xq");
    expect(h264).toBeLessThan(prores);
    expect(prores).toBeLessThan(xq);
  });

  it("formats values for the export inspector", () => {
    expect(formatBytes(1_048_576)).toBe("1.00 MB");
  });
});
