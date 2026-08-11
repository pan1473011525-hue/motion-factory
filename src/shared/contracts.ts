import {z} from "zod";
import {exportPresetIdSchema, type ExportPresetId} from "./export-presets";
import {
  motionProjectSchema,
  projectAnimationSchema,
  projectCanvasSchema,
  type MotionProject,
  type ProjectAsset,
} from "../../packages/project-model/src";
export {statCounterSchema, type StatCounterProps} from "../templates/stat-counter/manifest";

export const renderStartRequestSchema = z.object({
  project: motionProjectSchema.extend({exportPresetId: exportPresetIdSchema}),
});

export type RenderStartRequest = z.infer<typeof renderStartRequestSchema>;

export const batchRenderStartRequestSchema = z.object({
  projects: z.array(motionProjectSchema.extend({exportPresetId: exportPresetIdSchema})).min(1).max(100),
});

export type BatchRenderStartRequest = z.infer<typeof batchRenderStartRequestSchema>;

export const projectWriteRequestSchema = z.object({
  project: motionProjectSchema,
});

export type ProjectWriteRequest = z.infer<typeof projectWriteRequestSchema>;

export const rendererErrorReportSchema = z.object({
  message: z.string().max(4_000),
  stack: z.string().max(20_000).optional(),
  source: z.string().max(1_000).optional(),
});

export const mediaSelectionRequestSchema = z.object({
  accept: z.array(z.enum(["image", "video"])).min(1),
});

export const relinkAssetsRequestSchema = z.object({
  project: motionProjectSchema,
  mode: z.enum(["files", "folder"]),
});

export const parameterPresetSchema = z.object({
  id: z.string().uuid(),
  name: z.string().trim().min(1).max(80),
  templateId: z.string().min(1),
  props: z.record(z.string(), z.unknown()),
  canvas: projectCanvasSchema,
  animation: projectAnimationSchema,
  exportPresetId: exportPresetIdSchema,
});

export const parameterPresetCollectionSchema = z.object({
  format: z.literal("motioner-presets"),
  version: z.literal(1),
  exportedAt: z.string().datetime({offset: true}),
  presets: z.array(parameterPresetSchema).max(200),
});

export type ParameterPreset = z.infer<typeof parameterPresetSchema>;
export type ParameterPresetCollection = z.infer<typeof parameterPresetCollectionSchema>;

export type MediaSelectionRequest = z.infer<typeof mediaSelectionRequestSchema>;

export type RendererErrorReport = z.infer<typeof rendererErrorReportSchema>;

export type RenderWorkerStartMessage = {
  type: "start";
  jobId: string;
  serveUrl: string;
  outputLocation: string;
  browserExecutable: string | null;
  binariesDirectory: string | null;
  overwriteExisting: boolean;
  project: MotionProject & {exportPresetId: ExportPresetId};
};

export type RenderWorkerCancelMessage = {
  type: "cancel";
  jobId: string;
};

export type RenderWorkerMessage =
  | RenderWorkerStartMessage
  | RenderWorkerCancelMessage;

export type RenderProgressEvent = {
  type: "progress";
  jobId: string;
  progress: number;
  renderedFrames: number;
  encodedFrames: number;
  stage: "queued" | "preparing" | "rendering" | "encoding" | "validating";
};

export type ExportValidation = {
  ok: boolean;
  summary: string;
  codec: string;
  profile: string | null;
  pixelFormat: string | null;
  width: number;
  height: number;
  fps: number;
  frames: number;
  fileSizeBytes: number;
  colorSpace: string | null;
  colorPrimaries: string | null;
  colorTransfer: string | null;
};

export type RenderCompleteEvent = {
  type: "complete";
  jobId: string;
  outputLocation: string;
  presetId: ExportPresetId;
  validation: ExportValidation;
};

export type RenderErrorEvent = {
  type: "error";
  jobId: string;
  message: string;
  cancelled: boolean;
  presetId?: ExportPresetId;
};

export type RenderEvent =
  | RenderProgressEvent
  | RenderCompleteEvent
  | RenderErrorEvent;

export type StartRenderResult =
  | {cancelled: true; reason?: string}
  | {cancelled: false; jobId: string; outputLocation: string; presetId: ExportPresetId; queuedAhead: number};

export type QueuedRenderResult = Exclude<StartRenderResult, {cancelled: true}>;

export type StartBatchRenderResult =
  | {cancelled: true}
  | {cancelled: false; outputDirectory: string; jobs: QueuedRenderResult[]};

export type CollectAssetsResult =
  | {cancelled: true}
  | {cancelled: false; project: MotionProject; destination: string; copied: number};

export type RelinkAssetsResult =
  | {cancelled: true}
  | {cancelled: false; project: MotionProject; relinked: number; unresolved: string[]};

export type PresetImportResult =
  | {cancelled: true}
  | {cancelled: false; collection: ParameterPresetCollection};

export type ProjectSession = {
  project: MotionProject;
  path: string | null;
};

export type ProjectOperationResult =
  | {cancelled: true}
  | {cancelled: false; session: ProjectSession};

export type AutosaveResult = {
  savedAt: string;
  target: "recovery";
  path: string;
};

export type RecoverySnapshot = {
  project: MotionProject;
  sourcePath: string | null;
  savedAt: string;
};

export type MenuCommand = "new" | "open" | "save" | "save-as";
export type CloseProjectDecision = "save" | "discard" | "cancel";

export type MotionerApi = {
  newProject: () => Promise<ProjectSession>;
  getLastProject: () => Promise<ProjectSession | null>;
  openProject: () => Promise<ProjectOperationResult>;
  saveProject: (request: ProjectWriteRequest) => Promise<ProjectOperationResult>;
  saveProjectAs: (request: ProjectWriteRequest) => Promise<ProjectOperationResult>;
  autosaveProject: (request: ProjectWriteRequest) => Promise<AutosaveResult>;
  getRecovery: () => Promise<RecoverySnapshot | null>;
  restoreRecovery: () => Promise<ProjectSession | null>;
  discardRecovery: () => Promise<void>;
  setProjectDirty: (dirty: boolean) => void;
  onRequestProjectClose: (listener: () => Promise<CloseProjectDecision>) => () => void;
  onSaveBeforeClose: (listener: () => Promise<boolean>) => () => void;
  reportRendererError: (report: RendererErrorReport) => void;
  selectMedia: (request: MediaSelectionRequest) => Promise<ProjectAsset | null>;
  selectFont: () => Promise<ProjectAsset | null>;
  collectProjectAssets: (request: ProjectWriteRequest) => Promise<CollectAssetsResult>;
  relinkProjectAssets: (request: z.infer<typeof relinkAssetsRequestSchema>) => Promise<RelinkAssetsResult>;
  exportParameterPresets: (collection: ParameterPresetCollection) => Promise<boolean>;
  importParameterPresets: () => Promise<PresetImportResult>;
  revealInFinder: (path: string) => Promise<boolean>;
  onMenuCommand: (listener: (command: MenuCommand) => void) => () => void;
  startRender: (request: RenderStartRequest) => Promise<StartRenderResult>;
  startBatchRender: (request: BatchRenderStartRequest) => Promise<StartBatchRenderResult>;
  cancelRender: (jobId: string) => Promise<boolean>;
  onRenderEvent: (listener: (event: RenderEvent) => void) => () => void;
};
