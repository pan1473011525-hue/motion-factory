import {contextBridge, ipcRenderer} from "electron";
import type {
  AutosaveResult,
  BatchRenderStartRequest,
  CollectAssetsResult,
  CloseProjectDecision,
  MenuCommand,
  MotionerApi,
  MediaSelectionRequest,
  ProjectOperationResult,
  ProjectSession,
  ProjectWriteRequest,
  RecoverySnapshot,
  RelinkAssetsResult,
  PresetImportResult,
  ParameterPresetCollection,
  RenderEvent,
  RendererErrorReport,
  RenderStartRequest,
  StartBatchRenderResult,
  StartRenderResult,
} from "../shared/contracts";

const api: MotionerApi = {
  newProject: (): Promise<ProjectSession> => ipcRenderer.invoke("project:new"),
  getLastProject: (): Promise<ProjectSession | null> => ipcRenderer.invoke("project:last-session"),
  openProject: (): Promise<ProjectOperationResult> =>
    ipcRenderer.invoke("project:open"),
  saveProject: (request: ProjectWriteRequest): Promise<ProjectOperationResult> =>
    ipcRenderer.invoke("project:save", request),
  saveProjectAs: (
    request: ProjectWriteRequest,
  ): Promise<ProjectOperationResult> => ipcRenderer.invoke("project:save-as", request),
  autosaveProject: (request: ProjectWriteRequest): Promise<AutosaveResult> =>
    ipcRenderer.invoke("project:autosave", request),
  getRecovery: (): Promise<RecoverySnapshot | null> =>
    ipcRenderer.invoke("project:recovery:get"),
  restoreRecovery: (): Promise<ProjectSession | null> =>
    ipcRenderer.invoke("project:recovery:restore"),
  discardRecovery: (): Promise<void> =>
    ipcRenderer.invoke("project:recovery:discard"),
  setProjectDirty: (dirty: boolean): void =>
    ipcRenderer.send("app:project-dirty", dirty),
  onRequestProjectClose: (listener: () => Promise<CloseProjectDecision>): (() => void) => {
    const handler = async (_event: Electron.IpcRendererEvent, requestId: string): Promise<void> => {
      let decision: CloseProjectDecision = "cancel";
      try {
        decision = await listener();
      } finally {
        ipcRenderer.send("app:close-decision-result", {requestId, decision});
      }
    };
    ipcRenderer.on("app:request-close-decision", handler);
    return () => ipcRenderer.removeListener("app:request-close-decision", handler);
  },
  onSaveBeforeClose: (listener: () => Promise<boolean>): (() => void) => {
    const handler = async (_event: Electron.IpcRendererEvent, requestId: string): Promise<void> => {
      let saved = false;
      try {
        saved = await listener();
      } finally {
        ipcRenderer.send("app:save-before-close-result", {requestId, saved});
      }
    };
    ipcRenderer.on("app:save-before-close", handler);
    return () => ipcRenderer.removeListener("app:save-before-close", handler);
  },
  reportRendererError: (report: RendererErrorReport): void =>
    ipcRenderer.send("app:renderer-error", report),
  selectMedia: (request: MediaSelectionRequest) =>
    ipcRenderer.invoke("media:select", request),
  selectFont: () => ipcRenderer.invoke("font:select"),
  collectProjectAssets: (request: ProjectWriteRequest): Promise<CollectAssetsResult> =>
    ipcRenderer.invoke("assets:collect", request),
  relinkProjectAssets: (request): Promise<RelinkAssetsResult> =>
    ipcRenderer.invoke("assets:relink", request),
  exportParameterPresets: (collection: ParameterPresetCollection): Promise<boolean> =>
    ipcRenderer.invoke("presets:export", collection),
  importParameterPresets: (): Promise<PresetImportResult> =>
    ipcRenderer.invoke("presets:import"),
  revealInFinder: (path: string): Promise<boolean> =>
    ipcRenderer.invoke("path:reveal", path),
  onMenuCommand: (listener: (command: MenuCommand) => void): (() => void) => {
    const handler = (_event: Electron.IpcRendererEvent, command: MenuCommand) =>
      listener(command);
    ipcRenderer.on("menu:command", handler);
    return () => ipcRenderer.removeListener("menu:command", handler);
  },
  startRender: (request: RenderStartRequest): Promise<StartRenderResult> =>
    ipcRenderer.invoke("render:start", request),
  startBatchRender: (request: BatchRenderStartRequest): Promise<StartBatchRenderResult> =>
    ipcRenderer.invoke("render:start-batch", request),
  cancelRender: (jobId: string): Promise<boolean> =>
    ipcRenderer.invoke("render:cancel", jobId),
  onRenderEvent: (listener: (event: RenderEvent) => void): (() => void) => {
    const handler = (_event: Electron.IpcRendererEvent, payload: RenderEvent) =>
      listener(payload);
    ipcRenderer.on("render:event", handler);
    return () => ipcRenderer.removeListener("render:event", handler);
  },
};

contextBridge.exposeInMainWorld("motioner", api);
