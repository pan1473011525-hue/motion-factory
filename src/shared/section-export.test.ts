import {describe, expect, it} from "vitest";
import type {Segment} from "../../packages/project-model/src";
import {buildSectionRanges, buildSectionsDocument, getSectionFileName} from "./section-export";

const markers: Segment[] = [
  {id: "4c33f7b4-ed74-443c-a6cb-df10c75c502e", label: "结尾 / CTA", frame: 70},
  {id: "f58a169e-a1d6-4279-a20d-51d99e58f709", label: "段 1", frame: 30},
  {id: "8d038430-e5d2-4130-a13b-8c7b24c2b170", label: "重复", frame: 30},
  {id: "51845560-5043-4afe-8a7e-9483f3b41c5d", label: "越界", frame: 120},
];

describe("section export", () => {
  it("sorts, deduplicates and clamps segment boundaries into inclusive frame ranges", () => {
    expect(buildSectionRanges(markers, 100, {numerator: 30, denominator: 1})).toEqual([
      {id: "section-1", label: "段 1", fromFrame: 0, toFrame: 29, frameCount: 30, durationSeconds: 1},
      {id: markers[1]!.id, label: "段 2", fromFrame: 30, toFrame: 69, frameCount: 40, durationSeconds: 1.333333},
      {id: markers[0]!.id, label: "结尾 / CTA", fromFrame: 70, toFrame: 99, frameCount: 30, durationSeconds: 1},
    ]);
  });

  it("builds safe, ordered output names", () => {
    const sections = buildSectionRanges(markers, 100, {numerator: 30, denominator: 1});
    expect(getSectionFileName(sections[0]!, 0, "mp4")).toBe("01-段-1.mp4");
    expect(getSectionFileName(sections[2]!, 2, "mp4")).toBe("03-结尾-CTA.mp4");
  });

  it("writes ffprobe-compatible fields for every rendered segment", () => {
    const [section] = buildSectionRanges([], 60, {numerator: 30_000, denominator: 1_001});
    const document = buildSectionsDocument({
      exportedAt: "2026-08-11T00:00:00.000Z",
      jobId: "job-1",
      projectId: "project-1",
      projectName: "分段测试",
      fps: {numerator: 30_000, denominator: 1_001},
      width: 1920,
      height: 1080,
      colorSpace: "bt709",
      artifacts: [{
        section: section!,
        fileName: "01-段-1.mp4",
        validation: {
          codec: "h264",
          width: 1920,
          height: 1080,
          fps: 30_000 / 1_001,
          frames: 60,
          fileSizeBytes: 2048,
          colorSpace: "bt709",
          colorPrimaries: "bt709",
          colorTransfer: "bt709",
        },
      }],
    });
    expect(document.segments[0]).toMatchObject({
      fileName: "01-段-1.mp4",
      codec_name: "h264",
      width: 1920,
      height: 1080,
      avg_frame_rate: "30000/1001",
      nb_frames: 60,
      duration: 2.002,
    });
  });
});
