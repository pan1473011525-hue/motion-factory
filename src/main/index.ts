import {randomUUID} from "node:crypto";
import {existsSync, readdirSync} from "node:fs";
import {copyFile, mkdir, readFile, statfs, writeFile} from "node:fs/promises";
import {basename, dirname, extname, join} from "node:path";
import {
  app,
  BrowserWindow,
  dialog,
  ipcMain,
  Menu,
  shell,
  utilityProcess,
  type MenuItemConstructorOptions,
  type UtilityProcess,
} from "electron";
import {
  getFrameRate,
  parseMotionProject,
  type MotionProject,
} from "../../packages/project-model/src";
import {validateTemplateAssets, validateTemplateDuration} from "../../packages/template-sdk/src";
import {
  batchRenderStartRequestSchema,
  parameterPresetCollectionSchema,
  projectWriteRequestSchema,
  mediaSelectionRequestSchema,
  relinkAssetsRequestSchema,
  rendererErrorReportSchema,
  renderStartRequestSchema,
  type MenuCommand,
  type ProjectOperationResult,
  type ProjectSession,
  type RecoverySnapshot,
  type RenderEvent,
  type RenderWorkerMessage,
  type StartRenderResult,
  type StartBatchRenderResult,
  type QueuedRenderResult,
  type CollectAssetsResult,
  type CloseProjectDecision,
  type PresetImportResult,
  type RelinkAssetsResult,
} from "../shared/contracts";
import {getExportPreset} from "../shared/export-presets";
import {estimateExportBytes} from "../shared/export-estimate";
import {createDefaultProject} from "../shared/default-project";
import {getTemplateManifest, upgradeProjectTemplate} from "../templates/catalog";
import {validateComposerComposition} from "../composer/registry";
import {writeAppLog} from "./logger";
import {fingerprintFile} from "./asset-fingerprint";
import {listFilesRecursively, matchAssetsByName} from "./asset-relink";
import {prepareMediaCache} from "./media-cache";
import {decideProjectCloseAction} from "./project-close-decision";
import {resolveOutputConflict} from "./output-conflict";
import {RenderJobQueue} from "./render-queue";
import {readRecentProjects, recordRecentProject} from "./recent-projects";
import {
  readProjectFile,
  readRecoveryFile,
  removeRecoveryFile,
  writeProjectFile,
  writeRecoveryFile,
} from "./project-file-store";

let mainWindow: BrowserWindow | null = null;
let renderWorker: UtilityProcess | null = null;
let currentProjectPath: string | null = null;
let rendererHasUnsavedChanges = false;
let allowWindowClose = false;
let quitRequested = false;
let closePromptActive = false;
let packagedE2EJobId: string | null = null;
let packagedE2EOutput: string | null = null;
const closeSaveResolvers = new Map<string, (saved: boolean) => void>();
const closeDecisionResolvers = new Map<string, (decision: CloseProjectDecision) => void>();
type QueuedRenderJob = Extract<RenderWorkerMessage, {type: "start"}>;
const renderJobQueue = new RenderJobQueue<QueuedRenderJob>();

const now = (): string => new Date().toISOString();

const getRecoveryPath = (): string =>
  join(app.getPath("userData"), "recovery", "active.mfxrecovery");

const getRecentProjectsPath = (): string =>
  join(app.getPath("userData"), "recent-projects.json");

const requestRendererSaveBeforeClose = (window: BrowserWindow): Promise<boolean> =>
  new Promise((resolve) => {
    const requestId = randomUUID();
    const timeout = setTimeout(() => {
      closeSaveResolvers.delete(requestId);
      resolve(false);
    }, 120_000);
    closeSaveResolvers.set(requestId, (saved) => {
      clearTimeout(timeout);
      closeSaveResolvers.delete(requestId);
      resolve(saved);
    });
    window.webContents.send("app:save-before-close", requestId);
  });

const requestRendererCloseDecision = (window: BrowserWindow): Promise<CloseProjectDecision> =>
  new Promise((resolve) => {
    const requestId = randomUUID();
    const timeout = setTimeout(() => {
      closeDecisionResolvers.delete(requestId);
      resolve("cancel");
    }, 120_000);
    closeDecisionResolvers.set(requestId, (decision) => {
      clearTimeout(timeout);
      closeDecisionResolvers.delete(requestId);
      resolve(decision);
    });
    window.webContents.send("app:request-close-decision", requestId);
  });

const touchProject = (project: MotionProject, name = project.name): MotionProject =>
  parseMotionProject({...project, name, updatedAt: now()});

const safeFileStem = (value: string): string =>
  value.trim().replace(/[\\/:*?"<>|]+/gu, "-").replace(/\s+/gu, " ").slice(0, 72) || "Motioner-导出";

const getOutputSuffix = (presetId: MotionProject["exportPresetId"]): string => {
  if (presetId === "prores-4444") return "prores4444";
  if (presetId === "prores-4444-xq") return "prores4444xq";
  if (presetId === "png-sequence") return "png";
  return "review";
};

const usesSegmentedOutput = (project: MotionProject): boolean => {
  const preset = getExportPreset(project.exportPresetId);
  return preset.kind === "video"
    && project.exportOptions.segmented
    && project.segments.some((segment) => segment.frame > 0 && segment.frame < project.canvas.durationInFrames);
};

const prepareProjectForRender = (input: MotionProject): QueuedRenderJob["project"] => {
  const project = upgradeProjectTemplate(input);
  const fps = getFrameRate(project.canvas.fps);
  if (project.editorMode === "composer") {
    const composerError = validateComposerComposition(project.composition, project.assets, project.canvas.durationInFrames);
    if (composerError) throw new Error(composerError);
    for (const node of project.composition.nodes) {
      if (node.componentId !== "template") continue;
      const manifest = getTemplateManifest(String(node.props.templateId ?? ""));
      const props = manifest.schema.parse(node.props.templateProps);
      const durationError = validateTemplateDuration(manifest, node.timing.durationInFrames, fps);
      if (durationError) throw new Error(`${node.name}：${durationError}`);
      const assetError = validateTemplateAssets(manifest, props, project.assets);
      if (assetError) throw new Error(`${node.name}：${assetError}`);
    }
  } else {
    const manifest = getTemplateManifest(project.template.id);
    const durationError = validateTemplateDuration(manifest, project.canvas.durationInFrames, fps);
    if (durationError) throw new Error(durationError);
    const assetError = validateTemplateAssets(manifest, project.props, project.assets);
    if (assetError) throw new Error(assetError);
  }
  const missingAsset = project.assets.find((asset) => !existsSync(asset.path));
  if (missingAsset) throw new Error(`素材文件已丢失，请重新链接：${missingAsset.path}`);
  const preset = getExportPreset(project.exportPresetId);
  return {...project, exportPresetId: preset.id};
};

const ensureOutputSpace = async (project: QueuedRenderJob["project"], outputPath: string): Promise<void> => {
  const parent = dirname(outputPath);
  const disk = await statfs(parent);
  const available = Number(disk.bavail) * Number(disk.bsize);
  const estimated = estimateExportBytes(project, project.exportPresetId);
  if (available < estimated * 1.15) {
    throw new Error(`目标磁盘空间不足：预计至少需要 ${(estimated * 1.15 / 1024 ** 3).toFixed(2)} GB`);
  }
};

const getServeUrl = (): string => {
  if (app.isPackaged) {
    return join(process.resourcesPath, "remotion");
  }

  return join(app.getAppPath(), "dist", "remotion");
};

const getPackagedBrowserExecutable = (): string | null => {
  if (!app.isPackaged) {
    return null;
  }

  const executable = join(
    process.resourcesPath,
    "chrome-headless-shell",
    "chrome-headless-shell",
  );

  return existsSync(executable) ? executable : null;
};

const getBinariesDirectory = (): string | null => {
  const architecture = process.arch === "arm64" ? "arm64" : "x64";
  const directory = app.isPackaged
    ? join(
      process.resourcesPath,
      "app.asar.unpacked",
      "node_modules",
      "@remotion",
      `compositor-darwin-${architecture}`,
    )
    : (() => {
      const pnpmRoot = join(app.getAppPath(), "node_modules", ".pnpm");
      if (!existsSync(pnpmRoot)) return "";
      const packageFolder = readdirSync(pnpmRoot).find((entry) =>
        entry.startsWith(`@remotion+compositor-darwin-${architecture}@`));
      return packageFolder
        ? join(pnpmRoot, packageFolder, "node_modules", "@remotion", `compositor-darwin-${architecture}`)
        : "";
    })();

  return existsSync(join(directory, "remotion")) ? directory : null;
};

const emitRenderEvent = (event: RenderEvent): void => {
  mainWindow?.webContents.send("render:event", event);
};

const dispatchNextRender = (): void => {
  const next = renderJobQueue.takeNext();
  if (!next) return;
  void writeAppLog(
    "INFO",
    "render",
    `开始导出 ${next.jobId}：${next.project.exportPresetId}`,
    next.outputLocation,
  );
  ensureRenderWorker().postMessage(next);
};

const enqueuePreparedRender = (
  project: QueuedRenderJob["project"],
  outputLocation: string,
  overwriteExisting = false,
): QueuedRenderResult => {
  const jobId = randomUUID();
  const message: QueuedRenderJob = {
    type: "start",
    jobId,
    serveUrl: getServeUrl(),
    outputLocation,
    browserExecutable: getPackagedBrowserExecutable(),
    binariesDirectory: getBinariesDirectory(),
    overwriteExisting,
    project,
  };
  const queuedAhead = renderJobQueue.enqueue(message);
  emitRenderEvent({
    type: "progress",
    jobId,
    progress: 0,
    renderedFrames: 0,
    encodedFrames: 0,
    stage: "queued",
  });
  return {cancelled: false, jobId, outputLocation, presetId: project.exportPresetId, queuedAhead};
};

const ensureRenderWorker = (): UtilityProcess => {
  if (renderWorker) {
    return renderWorker;
  }

  renderWorker = utilityProcess.fork(join(__dirname, "render-worker.js"), [], {
    serviceName: "Motioner Renderer",
  });

  renderWorker.on("message", (event: RenderEvent) => {
    emitRenderEvent(event);
    if (event.type === "complete" || event.type === "error") {
      const finished = renderJobQueue.finish(event.jobId);
      if (!finished) return;
      void writeAppLog(
        event.type === "complete" ? "INFO" : event.cancelled ? "INFO" : "ERROR",
        "render",
        event.type === "complete"
          ? `导出完成 ${event.jobId}：${event.validation.summary}`
          : `${event.cancelled ? "导出已取消" : "导出失败"} ${event.jobId}：${event.message}`,
        finished.outputLocation,
      );
      if (event.jobId === packagedE2EJobId && packagedE2EOutput) {
        const report = {application: "Motioner", version: app.getVersion(), event};
        void writeFile(`${packagedE2EOutput}.e2e.json`, `${JSON.stringify(report, null, 2)}\n`, "utf8").then(() => {
          renderWorker?.kill();
          app.exit(event.type === "complete" ? 0 : 1);
        });
        return;
      }
      dispatchNextRender();
    }
  });

  renderWorker.on("exit", (code) => {
    const interrupted = renderJobQueue.getActive();
    if (interrupted) renderJobQueue.finish(interrupted.jobId);
    if (code !== 0 && interrupted) {
      const message = `渲染进程异常退出（代码 ${code}）`;
      emitRenderEvent({
        type: "error",
        jobId: interrupted.jobId,
        message,
        cancelled: false,
        presetId: interrupted.project.exportPresetId,
      });
      void writeAppLog("ERROR", "render-worker", message);
    }
    renderWorker = null;
    dispatchNextRender();
  });

  return renderWorker;
};

const sendMenuCommand = (command: MenuCommand): void => {
  mainWindow?.webContents.send("menu:command", command);
};

const installApplicationMenu = (): void => {
  const template: MenuItemConstructorOptions[] = [
    {
      label: app.name,
      submenu: [
        {role: "about"},
        {type: "separator"},
        {role: "hide"},
        {role: "hideOthers"},
        {role: "unhide"},
        {type: "separator"},
        {role: "quit"},
      ],
    },
    {
      label: "文件",
      submenu: [
        {label: "新建项目", accelerator: "CmdOrCtrl+N", click: () => sendMenuCommand("new")},
        {label: "打开项目…", accelerator: "CmdOrCtrl+O", click: () => sendMenuCommand("open")},
        {type: "separator"},
        {label: "保存", accelerator: "CmdOrCtrl+S", click: () => sendMenuCommand("save")},
        {
          label: "另存为…",
          accelerator: "CmdOrCtrl+Shift+S",
          click: () => sendMenuCommand("save-as"),
        },
        {type: "separator"},
        {role: "close"},
      ],
    },
    {
      label: "编辑",
      submenu: [
        {role: "undo"},
        {role: "redo"},
        {type: "separator"},
        {role: "cut"},
        {role: "copy"},
        {role: "paste"},
        {role: "selectAll"},
      ],
    },
    {
      label: "显示",
      submenu: [{role: "reload"}, {role: "toggleDevTools"}, {type: "separator"}, {role: "togglefullscreen"}],
    },
    {
      label: "窗口",
      submenu: [{role: "minimize"}, {role: "zoom"}, {type: "separator"}, {role: "front"}],
    },
  ];

  Menu.setApplicationMenu(Menu.buildFromTemplate(template));
};

const createWindow = (): void => {
  allowWindowClose = false;
  quitRequested = false;
  closePromptActive = false;
  rendererHasUnsavedChanges = false;
  const window = new BrowserWindow({
    width: 1440,
    height: 900,
    minWidth: 1280,
    minHeight: 760,
    show: false,
    backgroundColor: "#181818",
    titleBarStyle: "hiddenInset",
    trafficLightPosition: {x: 18, y: 18},
    webPreferences: {
      preload: join(__dirname, "../preload/index.js"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });
  mainWindow = window;

  window.on("close", (event) => {
    if (allowWindowClose) return;
    event.preventDefault();
    if (closePromptActive) return;
    closePromptActive = true;
    void (async () => {
      let closeAction = decideProjectCloseAction(rendererHasUnsavedChanges);
      if (rendererHasUnsavedChanges) {
        closeAction = decideProjectCloseAction(true, await requestRendererCloseDecision(window));
        if (closeAction === "cancel") {
          quitRequested = false;
          return;
        }
        if (closeAction === "save" && !await requestRendererSaveBeforeClose(window)) {
          quitRequested = false;
          return;
        }
      }

      await removeRecoveryFile(getRecoveryPath());
      rendererHasUnsavedChanges = false;
      allowWindowClose = true;
      if (quitRequested) app.quit();
      else window.close();
    })().catch((error) => {
      quitRequested = false;
      const message = error instanceof Error ? error.message : String(error);
      void writeAppLog("ERROR", "project-close", "关闭项目前处理失败", message);
      dialog.showErrorBox("无法关闭项目", message);
    }).finally(() => {
      closePromptActive = false;
    });
  });

  window.on("closed", () => {
    if (mainWindow === window) mainWindow = null;
  });

  window.once("ready-to-show", () => window.show());

  if (process.env.ELECTRON_RENDERER_URL) {
    void window.loadURL(process.env.ELECTRON_RENDERER_URL);
  } else {
    void window.loadFile(join(__dirname, "../renderer/index.html"));
  }
};

const chooseProjectSavePath = async (project: MotionProject): Promise<string | null> => {
  const result = await dialog.showSaveDialog(mainWindow!, {
    title: "保存 Motioner 项目",
    defaultPath: `${project.name}.mfxproj`,
    filters: [{name: "Motioner 项目", extensions: ["mfxproj"]}],
  });

  return result.canceled ? null : (result.filePath ?? null);
};

const saveProject = async (
  project: MotionProject,
  forceSaveAs: boolean,
): Promise<ProjectOperationResult> => {
  const path = forceSaveAs || !currentProjectPath
    ? await chooseProjectSavePath(project)
    : currentProjectPath;

  if (!path) {
    return {cancelled: true};
  }

  const fileName = basename(path, extname(path));
  const savedProject = touchProject(project, fileName || project.name);
  await writeProjectFile(path, savedProject);
  currentProjectPath = path;
  await removeRecoveryFile(getRecoveryPath());
  await recordRecentProject(getRecentProjectsPath(), {path, name: savedProject.name, openedAt: now()});
  void writeAppLog("INFO", "project", `已保存项目：${path}`);

  return {
    cancelled: false,
    session: {project: savedProject, path},
  };
};

ipcMain.handle("project:last-session", async (): Promise<ProjectSession | null> => {
  const recent = await readRecentProjects(getRecentProjectsPath());
  for (const entry of recent) {
    if (!existsSync(entry.path)) continue;
    try {
      const project = upgradeProjectTemplate(await readProjectFile(entry.path));
      currentProjectPath = entry.path;
      return {project, path: entry.path};
    } catch {
      continue;
    }
  }
  return null;
});

ipcMain.handle("project:new", async (): Promise<ProjectSession> => {
  currentProjectPath = null;
  await removeRecoveryFile(getRecoveryPath());
  return {
    project: createDefaultProject(randomUUID(), now()),
    path: null,
  };
});

ipcMain.handle("project:open", async (): Promise<ProjectOperationResult> => {
  const result = await dialog.showOpenDialog(mainWindow!, {
    title: "打开 Motioner 项目",
    properties: ["openFile"],
    filters: [{name: "Motioner 项目", extensions: ["mfxproj"]}],
  });

  const path = result.filePaths[0];
  if (result.canceled || !path) {
    return {cancelled: true};
  }

  try {
    const project = upgradeProjectTemplate(await readProjectFile(path));
    currentProjectPath = path;
    await removeRecoveryFile(getRecoveryPath());
    await recordRecentProject(getRecentProjectsPath(), {path, name: project.name, openedAt: now()});
    void writeAppLog("INFO", "project", `已打开项目：${path}`);
    return {cancelled: false, session: {project, path}};
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    void writeAppLog("ERROR", "project-open", `无法打开项目：${path}`, message);
    dialog.showErrorBox("项目无法打开", message);
    throw error;
  }
});

ipcMain.handle("project:save", async (_event, rawRequest): Promise<ProjectOperationResult> => {
  const {project} = projectWriteRequestSchema.parse(rawRequest);
  return saveProject(project, false);
});

ipcMain.handle(
  "project:save-as",
  async (_event, rawRequest): Promise<ProjectOperationResult> => {
    const {project} = projectWriteRequestSchema.parse(rawRequest);
    return saveProject(project, true);
  },
);

ipcMain.handle("project:autosave", async (_event, rawRequest) => {
  const {project} = projectWriteRequestSchema.parse(rawRequest);
  const savedAt = now();
  const updatedProject = touchProject(project);
  const recoveryPath = getRecoveryPath();
  await writeRecoveryFile(recoveryPath, {
    project: updatedProject,
    sourcePath: currentProjectPath,
    savedAt,
  });
  return {savedAt, target: "recovery", path: recoveryPath} as const;
});

ipcMain.handle("project:recovery:get", async (): Promise<RecoverySnapshot | null> => {
  try {
    return await readRecoveryFile(getRecoveryPath());
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    void writeAppLog("ERROR", "recovery", "恢复文件无效", message);
    return null;
  }
});

ipcMain.handle("project:recovery:restore", async (): Promise<ProjectSession | null> => {
  const snapshot = await readRecoveryFile(getRecoveryPath());
  if (!snapshot) return null;
  currentProjectPath = snapshot.sourcePath;
  return {project: snapshot.project, path: snapshot.sourcePath};
});

ipcMain.handle("project:recovery:discard", async (): Promise<void> => {
  await removeRecoveryFile(getRecoveryPath());
});

ipcMain.on("app:project-dirty", (event, dirty: unknown) => {
  if (event.sender !== mainWindow?.webContents || typeof dirty !== "boolean") return;
  rendererHasUnsavedChanges = dirty;
});

ipcMain.on("app:close-decision-result", (event, rawResult: unknown) => {
  if (event.sender !== mainWindow?.webContents || typeof rawResult !== "object" || rawResult === null) return;
  const requestId = Reflect.get(rawResult, "requestId");
  const decision = Reflect.get(rawResult, "decision");
  if (typeof requestId !== "string" || !["save", "discard", "cancel"].includes(String(decision))) return;
  closeDecisionResolvers.get(requestId)?.(decision as CloseProjectDecision);
});

ipcMain.on("app:save-before-close-result", (event, rawResult: unknown) => {
  if (event.sender !== mainWindow?.webContents || typeof rawResult !== "object" || rawResult === null) return;
  const requestId = Reflect.get(rawResult, "requestId");
  const saved = Reflect.get(rawResult, "saved");
  if (typeof requestId !== "string" || typeof saved !== "boolean") return;
  closeSaveResolvers.get(requestId)?.(saved);
});

ipcMain.on("app:renderer-error", (_event, rawReport) => {
  const report = rendererErrorReportSchema.safeParse(rawReport);
  if (!report.success) return;
  void writeAppLog(
    "ERROR",
    report.data.source ?? "renderer",
    report.data.message,
    report.data.stack,
  );
});

ipcMain.handle("media:select", async (_event, rawRequest) => {
  const request = mediaSelectionRequestSchema.parse(rawRequest);
  const extensions = [
    ...(request.accept.includes("image") ? ["png", "jpg", "jpeg", "webp", "gif", "tif", "tiff", "svg"] : []),
    ...(request.accept.includes("video") ? ["mov", "mp4", "m4v", "webm"] : []),
  ];
  const result = await dialog.showOpenDialog(mainWindow!, {
    title: "选择媒体素材",
    properties: ["openFile"],
    filters: [{name: "媒体文件", extensions}],
  });
  const path = result.filePaths[0];
  if (result.canceled || !path) return null;
  const videoExtensions = new Set([".mov", ".mp4", ".m4v", ".webm"]);
  return prepareMediaCache({
    id: randomUUID(),
    path,
    kind: videoExtensions.has(extname(path).toLowerCase()) ? "video" : "image",
  } as const, join(app.getPath("userData"), "cache"), getBinariesDirectory());
});

ipcMain.handle("font:select", async () => {
  const result = await dialog.showOpenDialog(mainWindow!, {
    title: "选择项目字体",
    properties: ["openFile"],
    filters: [{name: "字体文件", extensions: ["ttf", "otf", "woff", "woff2"]}],
  });
  const path = result.filePaths[0];
  if (result.canceled || !path) return null;
  return prepareMediaCache({id: randomUUID(), path, kind: "font"}, join(app.getPath("userData"), "cache"), getBinariesDirectory());
});

ipcMain.handle("assets:collect", async (_event, rawRequest): Promise<CollectAssetsResult> => {
  const {project} = projectWriteRequestSchema.parse(rawRequest);
  if (project.assets.length === 0) {
    return {cancelled: false, project, destination: "", copied: 0};
  }
  const defaultParent = currentProjectPath ? dirname(currentProjectPath) : app.getPath("documents");
  const result = await dialog.showSaveDialog(mainWindow!, {
    title: "收集 Motioner 项目素材",
    defaultPath: join(defaultParent, `${safeFileStem(project.name)}.assets`),
    buttonLabel: "收集到此文件夹",
  });
  if (result.canceled || !result.filePath) return {cancelled: true};
  await mkdir(result.filePath, {recursive: true});
  const usedNames = new Set<string>();
  const assets = [];
  for (const asset of project.assets) {
    if (!existsSync(asset.path)) throw new Error(`素材不存在：${asset.path}`);
    const originalName = basename(asset.path);
    const destinationName = usedNames.has(originalName)
      ? `${asset.id.slice(0, 8)}-${originalName}`
      : originalName;
    usedNames.add(destinationName);
    const destination = join(result.filePath, destinationName);
    await copyFile(asset.path, destination);
    assets.push({...asset, path: destination, fingerprint: await fingerprintFile(destination)});
  }
  const collectedProject = touchProject({...project, assets});
  void writeAppLog("INFO", "assets", `已收集 ${assets.length} 个项目素材`, result.filePath);
  return {cancelled: false, project: collectedProject, destination: result.filePath, copied: assets.length};
});

ipcMain.handle("assets:relink", async (_event, rawRequest): Promise<RelinkAssetsResult> => {
  const {project, mode} = relinkAssetsRequestSchema.parse(rawRequest);
  const missing = project.assets.filter((asset) => !existsSync(asset.path));
  const targets = missing.length > 0 ? missing : project.assets;
  if (targets.length === 0) return {cancelled: false, project, relinked: 0, unresolved: []};
  const result = mode === "folder"
    ? await dialog.showOpenDialog(mainWindow!, {title: "选择素材所在文件夹", properties: ["openDirectory"]})
    : await dialog.showOpenDialog(mainWindow!, {title: "选择替换素材", properties: ["openFile", "multiSelections"]});
  if (result.canceled || result.filePaths.length === 0) return {cancelled: true};
  const candidates = mode === "folder" ? await listFilesRecursively(result.filePaths[0]!) : result.filePaths;
  const matches = matchAssetsByName(targets, candidates);
  const assets = await Promise.all(project.assets.map(async (asset) => {
    const path = matches.get(asset.id);
    if (!path) return asset;
    return prepareMediaCache({...asset, path, proxyPath: undefined, thumbnailPath: undefined}, join(app.getPath("userData"), "cache"), getBinariesDirectory());
  }));
  const relinkedProject = touchProject({...project, assets});
  const unresolved = targets.filter((asset) => !matches.has(asset.id)).map((asset) => basename(asset.path));
  void writeAppLog("INFO", "assets", `重新链接 ${matches.size} 个素材`, unresolved.length ? `仍缺失：${unresolved.join(", ")}` : undefined);
  return {cancelled: false, project: relinkedProject, relinked: matches.size, unresolved};
});

ipcMain.handle("presets:export", async (_event, rawCollection): Promise<boolean> => {
  const collection = parameterPresetCollectionSchema.parse(rawCollection);
  const result = await dialog.showSaveDialog(mainWindow!, {
    title: "导出 Motioner 参数预设",
    defaultPath: "Motioner-参数预设.motioner-presets.json",
    filters: [{name: "Motioner 参数预设", extensions: ["json"]}],
  });
  if (result.canceled || !result.filePath) return false;
  await writeFile(result.filePath, `${JSON.stringify(collection, null, 2)}\n`, "utf8");
  return true;
});

ipcMain.handle("presets:import", async (): Promise<PresetImportResult> => {
  const result = await dialog.showOpenDialog(mainWindow!, {
    title: "导入 Motioner 参数预设",
    properties: ["openFile"],
    filters: [{name: "Motioner 参数预设", extensions: ["json"]}],
  });
  const path = result.filePaths[0];
  if (result.canceled || !path) return {cancelled: true};
  const collection = parameterPresetCollectionSchema.parse(JSON.parse(await readFile(path, "utf8")) as unknown);
  return {cancelled: false, collection};
});

ipcMain.handle("path:reveal", (_event, path: string): boolean => {
  if (typeof path !== "string" || !existsSync(path)) return false;
  shell.showItemInFolder(path);
  return true;
});

ipcMain.handle("render:start", async (_event, rawRequest): Promise<StartRenderResult> => {
  const request = renderStartRequestSchema.parse(rawRequest);
  const project = prepareProjectForRender(request.project);
  const preset = getExportPreset(project.exportPresetId);
  const baseName = currentProjectPath
    ? basename(currentProjectPath, extname(currentProjectPath))
    : project.name || "Motioner-导出";
  const suffix = getOutputSuffix(preset.id);
  const segmented = usesSegmentedOutput(project);
  const defaultName = segmented
    ? `${baseName}-${suffix}-segments`
    : `${baseName}-${suffix}${preset.extension ? `.${preset.extension}` : ""}`;
  const defaultPath = currentProjectPath
    ? join(dirname(currentProjectPath), defaultName)
    : defaultName;
  const result = await dialog.showSaveDialog(mainWindow!, {
    title: segmented ? `选择 ${preset.label} 分段输出文件夹` : preset.kind === "image-sequence" ? "选择 PNG 序列文件夹" : `导出 ${preset.label}`,
    defaultPath,
    ...(preset.extension && !segmented
      ? {filters: [{name: preset.shortLabel, extensions: [preset.extension]}]}
      : {buttonLabel: segmented ? "导出分段" : "选择文件夹"}),
  });

  if (result.canceled || !result.filePath) {
    return {cancelled: true};
  }
  const resolution = resolveOutputConflict(result.filePath, project.exportOptions.conflictPolicy);
  if (resolution.skipped) return {cancelled: true, reason: "目标已存在，按当前策略跳过"};
  await ensureOutputSpace(project, resolution.path);
  const queued = enqueuePreparedRender(project, resolution.path, resolution.overwriteExisting);
  dispatchNextRender();
  return queued;
});

ipcMain.handle("render:start-batch", async (_event, rawRequest): Promise<StartBatchRenderResult> => {
  const request = batchRenderStartRequestSchema.parse(rawRequest);
  const projects = request.projects.map(prepareProjectForRender);
  const result = await dialog.showOpenDialog(mainWindow!, {
    title: "选择 Motioner 批量导出目录",
    defaultPath: currentProjectPath ? dirname(currentProjectPath) : app.getPath("videos"),
    properties: ["openDirectory", "createDirectory"],
    buttonLabel: "开始批量导出",
  });
  const selectedDirectory = result.filePaths[0];
  if (result.canceled || !selectedDirectory) return {cancelled: true};
  const batchDirectory = join(
    selectedDirectory,
    `Motioner-Batch-${new Date().toISOString().replace(/[:.]/gu, "-")}`,
  );
  await mkdir(batchDirectory, {recursive: true});
  const totalEstimate = projects.reduce(
    (sum, project) => sum + estimateExportBytes(project, project.exportPresetId),
    0,
  );
  const disk = await statfs(selectedDirectory);
  const available = Number(disk.bavail) * Number(disk.bsize);
  if (available < totalEstimate * 1.15) {
    throw new Error(`批量导出磁盘空间不足：预计至少需要 ${(totalEstimate * 1.15 / 1024 ** 3).toFixed(2)} GB`);
  }
  const jobs = projects.map((project, index) => {
    const preset = getExportPreset(project.exportPresetId);
    const prefix = String(index + 1).padStart(3, "0");
    const fileName = usesSegmentedOutput(project)
      ? `${prefix}-${safeFileStem(project.name)}-${getOutputSuffix(preset.id)}-segments`
      : `${prefix}-${safeFileStem(project.name)}-${getOutputSuffix(preset.id)}${preset.extension ? `.${preset.extension}` : ""}`;
    return enqueuePreparedRender(project, join(batchDirectory, fileName));
  });
  dispatchNextRender();
  void writeAppLog("INFO", "render-batch", `已加入 ${jobs.length} 个批量导出任务`, batchDirectory);
  return {cancelled: false, outputDirectory: batchDirectory, jobs};
});

ipcMain.handle("render:cancel", (_event, jobId: string): boolean => {
  if (typeof jobId !== "string") {
    return false;
  }
  if (renderJobQueue.getActive()?.jobId === jobId && renderWorker) {
    renderWorker.postMessage({type: "cancel", jobId} satisfies RenderWorkerMessage);
    return true;
  }
  const cancelled = renderJobQueue.removePending(jobId);
  if (!cancelled) return false;
  emitRenderEvent({
    type: "error",
    jobId,
    message: "已从导出队列移除",
    cancelled: true,
    presetId: cancelled.project.exportPresetId,
  });
  return true;
});

process.on("uncaughtExceptionMonitor", (error) => {
  void writeAppLog("ERROR", "main", error.message, error.stack);
});

process.on("unhandledRejection", (reason) => {
  const error = reason instanceof Error ? reason : new Error(String(reason));
  void writeAppLog("ERROR", "main-promise", error.message, error.stack);
});

const runPackagedE2E = async (outputLocation: string): Promise<void> => {
  await mkdir(dirname(outputLocation), {recursive: true});
  const base = createDefaultProject(randomUUID(), now());
  const project = prepareProjectForRender(parseMotionProject({
    ...base,
    name: "Motioner Packaged E2E",
    canvas: {...base.canvas, width: 640, height: 360, durationInFrames: 75},
    exportPresetId: "h264-review",
    exportOptions: {conflictPolicy: "replace", segmented: true},
    segments: [
      {id: randomUUID(), label: "段 2", frame: 25},
      {id: randomUUID(), label: "片尾", frame: 50},
    ],
  }));
  const queued = enqueuePreparedRender(project, outputLocation, true);
  packagedE2EJobId = queued.jobId;
  packagedE2EOutput = outputLocation;
  dispatchNextRender();
};

void app.whenReady().then(() => {
  const e2eOutput = process.env.MOTIONER_E2E_OUTPUT;
  if (e2eOutput) {
    void runPackagedE2E(e2eOutput).catch((error) => {
      void writeFile(`${e2eOutput}.e2e.json`, `${JSON.stringify({application: "Motioner", error: error instanceof Error ? error.message : String(error)}, null, 2)}\n`, "utf8").finally(() => app.exit(1));
    });
    return;
  }
  installApplicationMenu();
  createWindow();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on("render-process-gone", (_event, _contents, details) => {
  void writeAppLog(
    "ERROR",
    "renderer-process",
    `渲染界面进程退出：${details.reason}`,
    `exitCode=${details.exitCode}`,
  );
});

app.on("child-process-gone", (_event, details) => {
  void writeAppLog(
    details.reason === "clean-exit" ? "INFO" : "ERROR",
    "child-process",
    `${details.type} 进程退出：${details.reason}`,
    `name=${details.name ?? "unknown"} exitCode=${details.exitCode}`,
  );
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});

app.on("before-quit", (event) => {
  if (mainWindow && !allowWindowClose) {
    event.preventDefault();
    quitRequested = true;
    mainWindow.close();
    return;
  }
  renderJobQueue.clear();
  renderWorker?.kill();
});
