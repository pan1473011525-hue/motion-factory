import type {MotionProject} from "../../packages/project-model/src";
import type {ExportPresetId} from "./export-presets";

export const estimateExportBytes = (
  project: Pick<MotionProject, "canvas">,
  presetId: ExportPresetId,
): number => {
  const {width, height, durationInFrames, fps} = project.canvas;
  const frameRate = fps.numerator / fps.denominator;
  const durationSeconds = durationInFrames / frameRate;
  const pixelScale = width * height / (1920 * 1080);
  const rateScale = frameRate / 30;
  if (presetId === "png-sequence") {
    return Math.ceil(width * height * 1.7 * durationInFrames);
  }
  if (presetId === "h264-review") {
    return Math.ceil((16_000_000 / 8) * pixelScale * rateScale * durationSeconds);
  }
  const referenceMbps = presetId === "prores-4444-xq" ? 500 : 330;
  return Math.ceil((referenceMbps * 1_000_000 / 8) * pixelScale * rateScale * durationSeconds);
};

export const formatBytes = (bytes: number): string => {
  if (bytes < 1024) return `${bytes} B`;
  const units = ["KB", "MB", "GB", "TB"];
  let value = bytes / 1024;
  let unit = units[0];
  for (let index = 1; index < units.length && value >= 1024; index += 1) {
    value /= 1024;
    unit = units[index];
  }
  return `${value.toFixed(value >= 100 ? 0 : value >= 10 ? 1 : 2)} ${unit}`;
};
