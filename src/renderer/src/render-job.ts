import type {MotionProject} from "../../../packages/project-model/src";
import type {ExportValidation} from "../../shared/contracts";
import type {ExportPresetId} from "../../shared/export-presets";

export type RenderJobState = {
  jobId: string;
  project: MotionProject;
  presetId: ExportPresetId;
  status: "queued" | "rendering" | "complete" | "error" | "cancelled";
  progress: number;
  detail: string;
  outputLocation: string;
  validation: ExportValidation | null;
};
