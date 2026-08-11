import type {FrameRate, Segment} from "../../packages/project-model/src";

export type SectionRange = {
  id: string;
  label: string;
  fromFrame: number;
  toFrame: number;
  frameCount: number;
  durationSeconds: number;
};

export type SectionMediaMetadata = {
  codec: string;
  width: number;
  height: number;
  fps: number;
  frames: number;
  fileSizeBytes: number;
  colorSpace: string | null;
  colorPrimaries: string | null;
  colorTransfer: string | null;
};

export type SectionArtifact<TValidation extends SectionMediaMetadata = SectionMediaMetadata> = {
  section: SectionRange;
  fileName: string;
  validation: TValidation;
};

const defaultSectionLabel = (index: number): string => `段 ${index + 1}`;

const getSectionLabel = (segment: Segment | undefined, index: number): string => {
  const label = segment?.label.trim();
  // 旧版本自动生成的“段 N”可能从第一个分段点而非隐含首段开始编号，统一重排。
  return !label || /^段\s*\d+$/u.test(label) ? defaultSectionLabel(index) : label;
};

export const buildSectionRanges = (
  segments: ReadonlyArray<Segment>,
  durationInFrames: number,
  fps: FrameRate,
): SectionRange[] => {
  const safeDuration = Math.max(1, Math.round(durationInFrames));
  const markersByFrame = new Map<number, Segment>();
  for (const segment of segments) {
    const frame = Math.round(segment.frame);
    if (frame > 0 && frame < safeDuration && !markersByFrame.has(frame)) {
      markersByFrame.set(frame, {...segment, frame});
    }
  }
  const bounds = [0, ...markersByFrame.keys(), safeDuration].sort((a, b) => a - b);
  const rate = fps.numerator / fps.denominator;
  return bounds.slice(0, -1).map((fromFrame, index) => {
    const nextFrame = bounds[index + 1] ?? safeDuration;
    const frameCount = nextFrame - fromFrame;
    const marker = index === 0 ? undefined : markersByFrame.get(fromFrame);
    return {
      id: marker?.id ?? `section-${index + 1}`,
      label: getSectionLabel(marker, index),
      fromFrame,
      toFrame: nextFrame - 1,
      frameCount,
      durationSeconds: Math.round(frameCount / rate * 1_000_000) / 1_000_000,
    };
  });
};

const safeFileStem = (value: string): string =>
  value.trim().replace(/[\\/:*?"<>|]+/gu, "-").replace(/\s+/gu, "-").replace(/-+/gu, "-").replace(/^-+|-+$/gu, "").slice(0, 48) || "section";

export const getSectionFileName = (
  section: SectionRange,
  index: number,
  extension: string,
): string => `${String(index + 1).padStart(2, "0")}-${safeFileStem(section.label)}.${extension}`;

export const buildSectionsDocument = (input: {
  exportedAt: string;
  jobId: string;
  projectId: string;
  projectName: string;
  fps: FrameRate;
  width: number;
  height: number;
  colorSpace: string | null;
  artifacts: ReadonlyArray<SectionArtifact>;
}) => ({
  application: "Motioner",
  version: 1,
  exportedAt: input.exportedAt,
  jobId: input.jobId,
  projectId: input.projectId,
  projectName: input.projectName,
  segmented: true,
  canvas: {
    width: input.width,
    height: input.height,
    fps: input.fps,
    colorSpace: input.colorSpace,
  },
  segments: input.artifacts.map(({section, fileName, validation}, index) => ({
    index: index + 1,
    id: section.id,
    label: section.label,
    fileName,
    fromFrame: section.fromFrame,
    toFrame: section.toFrame,
    frameCount: section.frameCount,
    durationSeconds: section.durationSeconds,
    codec_name: validation.codec,
    width: validation.width,
    height: validation.height,
    avg_frame_rate: `${input.fps.numerator}/${input.fps.denominator}`,
    duration: Math.round(validation.frames / validation.fps * 1_000_000) / 1_000_000,
    nb_frames: validation.frames,
    fileSizeBytes: validation.fileSizeBytes,
    color_space: validation.colorSpace,
    color_primaries: validation.colorPrimaries,
    color_transfer: validation.colorTransfer,
  })),
});
