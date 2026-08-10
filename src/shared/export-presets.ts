import {
  exportPresetIdSchema,
  type ExportPresetId,
} from "../../packages/project-model/src";

export {exportPresetIdSchema};
export type {ExportPresetId};

export type ExportPreset = {
  id: ExportPresetId;
  label: string;
  shortLabel: string;
  description: string;
  kind: "video" | "image-sequence";
  extension: "mov" | "mp4" | null;
  alpha: boolean;
};

export const EXPORT_PRESETS: ReadonlyArray<ExportPreset> = [
  {id: "prores-4444", label: "ProRes 4444（透明）", shortLabel: "ProRes 4444", description: "剪辑软件通用透明成片", kind: "video", extension: "mov", alpha: true},
  {id: "prores-4444-xq", label: "ProRes 4444 XQ（透明）", shortLabel: "ProRes 4444 XQ", description: "更高码率的透明母版", kind: "video", extension: "mov", alpha: true},
  {id: "png-sequence", label: "PNG 图像序列（透明）", shortLabel: "PNG 序列", description: "逐帧无损透明图像", kind: "image-sequence", extension: null, alpha: true},
  {id: "h264-review", label: "H.264 审看版", shortLabel: "H.264 审看", description: "体积较小，不含透明通道", kind: "video", extension: "mp4", alpha: false},
];

export const getExportPreset = (id: string): ExportPreset => {
  const preset = EXPORT_PRESETS.find((candidate) => candidate.id === id);
  if (!preset) throw new Error(`未知导出预设：${id}`);
  return preset;
};
