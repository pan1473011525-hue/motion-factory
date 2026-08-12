import {Player, type PlayerRef} from "@remotion/player";
import {
  Copy,
  Download,
  FilePlus,
  FolderOpen,
  Image,
  Keyboard,
  LayoutTemplate,
  Pause,
  Pencil,
  Play,
  Redo2,
  RotateCcw,
  Save,
  Scan,
  Trash2,
  Undo2,
  X,
} from "lucide-react";
import {useCallback, useEffect, useRef, useState} from "react";
import {
  FRAME_RATE_PRESETS,
  formatTimecode,
  framesToSeconds,
  getFrameRate,
  secondsToFrames,
  type ComposerComponentId,
  type ComposerComposition,
  type ComposerMotionPresetId,
  type ComposerNode,
  type FrameRate,
  type MotionProject,
  type Segment,
  type TimeSlot,
} from "../../../packages/project-model/src";
import {
  validateTemplateAssets,
  validateTemplateDuration,
  type InspectorField,
  type MediaInspectorField,
} from "../../../packages/template-sdk/src";
import {
  type MenuCommand,
  type CloseProjectDecision,
  type ProjectSession,
  type RecoverySnapshot,
  type RenderEvent,
  type ParameterPreset,
} from "../../shared/contracts";
import {
  EXPORT_PRESETS,
  getExportPreset,
  type ExportPresetId,
} from "../../shared/export-presets";
import {estimateExportBytes, formatBytes} from "../../shared/export-estimate";
import {createDefaultProject} from "../../shared/default-project";
import {getTemplateManifest, upgradeProjectTemplate} from "../../templates/catalog";
import {MotionerComposition} from "../../templates/runtime";
import {createComposerNode, validateComposerComposition} from "../../composer/registry";
import {Inspector} from "./Inspector";
import {InspectorGroup} from "./InspectorGroup";
import {parseCsv} from "./csv";
import {BatchImportPanel} from "./BatchImportPanel";
import {inferBatchMappings, type BatchDraft} from "./batch";
import {RenderQueuePanel} from "./RenderQueuePanel";
import {placeRectAtPoint} from "./composer-interaction";
import type {RenderJobState} from "./render-job";
import {TemplateLibrary} from "./TemplateLibrary";
import {ComponentLibrary} from "./ComponentLibrary";
import {ComposerCanvasOverlay} from "./ComposerCanvasOverlay";
import {ComposerInspector, type ComposerInspectorView} from "./ComposerInspector";
import {shouldPreserveComposerSelection} from "./composer-selection";
import {ComposerTimeline} from "./ComposerTimeline";
import {OutputQuickSettings} from "./OutputQuickSettings";
import {ResolutionSettings} from "./ResolutionSettings";
import {TemplateAppearanceEditor} from "./TemplateAppearanceEditor";
import {CompactPropertyRow, RangeNumberControl} from "./PropertyControls";
import {ShortcutSettings} from "./ShortcutSettings";
import {Select} from "./Select";
import {CloseProjectDialog} from "./CloseProjectDialog";
import {GlobalTooltip} from "./GlobalTooltip";
import {getTemplateSelectionAction} from "./template-selection";
import {findShortcutCommand, isEditableShortcutTarget, mergeShortcutBindings, type ShortcutBindingMap, type ShortcutCommandId} from "./shortcuts";
import motionerIcon from "./assets/motioner-icon.png";

type SaveState = "idle" | "dirty" | "saving" | "saved" | "recovery" | "error";
type PreviewBackground = "checker" | "black" | "white" | "gray" | "image";
type TemplateInspectorView = "edit" | "export";

const loadStorage = <T,>(key: string, fallback: T): T => {
  try {
    const value = window.localStorage.getItem(key);
    return value ? JSON.parse(value) as T : fallback;
  } catch {
    return fallback;
  }
};

const makeInitialProject = (): MotionProject =>
  createDefaultProject(globalThis.crypto.randomUUID(), new Date().toISOString());

const getStageLabel = (
  event: Extract<RenderEvent, {type: "progress"}>,
  totalFrames: number,
): string => {
  if (event.stage === "queued") return "等待前序任务完成";
  if (event.stage === "preparing") return "准备模板与渲染器";
  if (event.stage === "encoding") return `编码 ${event.encodedFrames} 帧`;
  if (event.stage === "validating") return "正在校验编码、帧率与帧数";
  return `渲染 ${event.renderedFrames} / ${totalFrames} 帧`;
};

const getProjectFileName = (path: string | null): string =>
  path ? path.split(/[\\/]/).at(-1) ?? path : "尚未保存";

const frameRateKey = (fps: FrameRate): string => `${fps.numerator}/${fps.denominator}`;

const DurationInput: React.FC<{
  seconds: number;
  frames: number;
  onCommit: (seconds: number) => void;
}> = ({seconds, frames, onCommit}) => <CompactPropertyRow label="目标时长（秒）" help={`实际 ${seconds.toFixed(4)} 秒 · ${frames} 帧`}><RangeNumberControl ariaLabel="目标时长" value={Number(seconds.toFixed(3))} min={0.1} max={7200} sliderMax={Math.max(60, Math.ceil(seconds))} step={0.1} resetValue={5} onChange={onCommit} /></CompactPropertyRow>;

export const App: React.FC = () => {
  const [project, setProject] = useState<MotionProject>(makeInitialProject);
  const [undoStack, setUndoStack] = useState<MotionProject[]>([]);
  const [redoStack, setRedoStack] = useState<MotionProject[]>([]);
  const [projectPath, setProjectPath] = useState<string | null>(null);
  const [renamingProject, setRenamingProject] = useState(false);
  const [projectNameDraft, setProjectNameDraft] = useState("");
  const [closeDialogOpen, setCloseDialogOpen] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const [saveDetail, setSaveDetail] = useState("新项目尚未保存");
  const [recovery, setRecovery] = useState<RecoverySnapshot | null>(null);
  const [projectError, setProjectError] = useState<string | null>(null);
  const [renderJobs, setRenderJobs] = useState<RenderJobState[]>(() =>
    loadStorage<RenderJobState[]>("motioner.renderJobs", []).map((job) =>
      job.status === "queued" || job.status === "rendering"
        ? {...job, status: "error", detail: "应用退出前任务未完成，可点击重试"}
        : job));
  const [safeArea, setSafeArea] = useState(false);
  const [favorites, setFavorites] = useState<string[]>(() => loadStorage("motioner.favorites", []));
  const [recentTemplates, setRecentTemplates] = useState<string[]>(() => loadStorage("motioner.recentTemplates", []));
  const [parameterPresets, setParameterPresets] = useState<ParameterPreset[]>(() => loadStorage("motioner.parameterPresets", []));
  const [previewBackground, setPreviewBackground] = useState<PreviewBackground>("checker");
  const [previewBackgroundImage, setPreviewBackgroundImage] = useState<string | null>(null);
  const [previewZoom, setPreviewZoom] = useState(100);
  const [previewLowQuality, setPreviewLowQuality] = useState(false);
  const [currentFrame, setCurrentFrame] = useState(0);
  const [batchDraft, setBatchDraft] = useState<BatchDraft | null>(null);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [multiSelectedIds, setMultiSelectedIds] = useState<string[]>([]);
  const [composerPreview, setComposerPreview] = useState<ComposerComposition | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [templateInspectorView, setTemplateInspectorView] = useState<TemplateInspectorView>("edit");
  const [composerInspectorView, setComposerInspectorView] = useState<ComposerInspectorView>("basic");
  const [shortcutSettingsOpen, setShortcutSettingsOpen] = useState(false);
  const [shortcutBindings, setShortcutBindings] = useState<ShortcutBindingMap>(() => mergeShortcutBindings(loadStorage("motioner.shortcuts", {})));
  const revisionRef = useRef(0);
  const playerRef = useRef<PlayerRef>(null);
  const scrubWasPlayingRef = useRef(false);
  const pendingTemplatePlaybackRef = useRef<string | null>(null);
  const projectNameInputRef = useRef<HTMLInputElement>(null);
  const closeDecisionResolverRef = useRef<((decision: CloseProjectDecision) => void) | null>(null);
  const batchCsvRef = useRef<HTMLInputElement>(null);
  const shortcutActionsRef = useRef<Partial<Record<ShortcutCommandId, () => void>>>({});

  const manifest = getTemplateManifest(project.template.id);
  const fps = getFrameRate(project.canvas.fps);
  const durationSeconds = framesToSeconds(project.canvas.durationInFrames, project.canvas.fps);
  const parsedProps = manifest.schema.safeParse(project.props);
  const durationError = validateTemplateDuration(manifest, project.canvas.durationInFrames, fps);
  const templateError = parsedProps.success ? null : parsedProps.error.issues[0]?.message ?? "模板参数无效";
  const assetError = validateTemplateAssets(manifest, project.props, project.assets);
  const composerScene = composerPreview ?? project.composition;
  const selectedNode = composerScene.nodes.find((node) => node.id === selectedNodeId) ?? null;
  const composerTemplateError = (() => {
    for (const node of project.composition.nodes) {
      if (node.componentId !== "template") continue;
      try {
        const nodeManifest = getTemplateManifest(String(node.props.templateId ?? ""));
        const nodeProps = nodeManifest.schema.parse(node.props.templateProps);
        const nodeAssetError = validateTemplateAssets(nodeManifest, nodeProps, project.assets);
        const nodeDurationError = validateTemplateDuration(nodeManifest, node.timing.durationInFrames, fps);
        if (nodeAssetError || nodeDurationError) return `${node.name}：${nodeAssetError ?? nodeDurationError}`;
      } catch {
        return `${node.name}：模板场景快照参数无效`;
      }
    }
    return null;
  })();
  const composerError = validateComposerComposition(project.composition, project.assets, project.canvas.durationInFrames) ?? composerTemplateError;
  const renderError = project.editorMode === "composer" ? composerError : templateError ?? durationError ?? assetError;
  const canRender = !renderError;
  const selectedExportPreset = getExportPreset(project.exportPresetId);
  const segmentedExportAvailable = selectedExportPreset.kind === "video" && project.segments.length > 0;
  const segmentedExportEnabled = segmentedExportAvailable && project.exportOptions.segmented;
  const selectedFont = project.assets.find((asset) => asset.id === project.typography.fontAssetId && asset.kind === "font");
  const activeJobCount = renderJobs.filter((job) => job.status === "queued" || job.status === "rendering").length;

  const markChanged = useCallback((next: MotionProject): void => {
    revisionRef.current += 1;
    setProject((current) => {
      setUndoStack((history) => [...history.slice(-49), structuredClone(current)]);
      return {...next, updatedAt: new Date().toISOString()};
    });
    setRedoStack([]);
    setDirty(true);
    setSaveState("dirty");
    setSaveDetail("有未保存更改");
  }, []);

  const beginProjectRename = (): void => {
    setProjectNameDraft(project.name);
    setRenamingProject(true);
    window.requestAnimationFrame(() => projectNameInputRef.current?.select());
  };

  const cancelProjectRename = (): void => {
    setProjectNameDraft(project.name);
    setRenamingProject(false);
  };

  const commitProjectRename = (): void => {
    const name = projectNameDraft.trim().slice(0, 96);
    setRenamingProject(false);
    if (!name || name === project.name) {
      setProjectNameDraft(project.name);
      return;
    }
    markChanged({...project, name});
  };

  const requestProjectCloseDecision = useCallback((): Promise<CloseProjectDecision> =>
    new Promise((resolve) => {
      closeDecisionResolverRef.current?.("cancel");
      closeDecisionResolverRef.current = resolve;
      setCloseDialogOpen(true);
    }), []);

  const resolveProjectCloseDecision = useCallback((decision: CloseProjectDecision): void => {
    const resolve = closeDecisionResolverRef.current;
    closeDecisionResolverRef.current = null;
    setCloseDialogOpen(false);
    resolve?.(decision);
  }, []);

  const applySession = useCallback((session: ProjectSession): boolean => {
    try {
      const upgraded = upgradeProjectTemplate(session.project);
      revisionRef.current += 1;
      setProject(upgraded);
      setProjectNameDraft(upgraded.name);
      setRenamingProject(false);
      setUndoStack([]);
      setRedoStack([]);
      setProjectPath(session.path);
      setDirty(false);
      setSaveState("saved");
      setSaveDetail(session.path ? "项目已保存" : "新项目尚未保存");
      setProjectError(null);
      setSelectedNodeId(upgraded.editorMode === "composer" ? upgraded.composition.nodes.at(-1)?.id ?? null : null);
      setMultiSelectedIds([]);
      setComposerPreview(null);
      setIsPlaying(false);
      return true;
    } catch (error) {
      setProjectError(error instanceof Error ? error.message : String(error));
      return false;
    }
  }, []);

  const undoProject = (): void => {
    const previous = undoStack.at(-1);
    if (!previous) return;
    setRedoStack((history) => [structuredClone(project), ...history].slice(0, 50));
    setUndoStack((history) => history.slice(0, -1));
    setProject({...previous, updatedAt: new Date().toISOString()});
    setDirty(true);
    setSaveState("dirty");
    setSaveDetail("已撤销，有未保存更改");
  };

  const redoProject = (): void => {
    const next = redoStack[0];
    if (!next) return;
    setUndoStack((history) => [...history.slice(-49), structuredClone(project)]);
    setRedoStack((history) => history.slice(1));
    setProject({...next, updatedAt: new Date().toISOString()});
    setDirty(true);
    setSaveState("dirty");
    setSaveDetail("已重做，有未保存更改");
  };

  const confirmReplaceCurrentProject = useCallback((): boolean => {
    if (!dirty) return true;
    return window.confirm(projectPath
      ? "当前项目有未保存修改。仍要切换到另一个项目吗？"
      : "当前未命名项目尚未保存为文件。仍要放弃并继续吗？");
  }, [dirty, projectPath]);

  const newProject = useCallback(async (): Promise<void> => {
    if (!window.motioner || !confirmReplaceCurrentProject()) return;
    try {
      const session = await window.motioner.newProject();
      if (applySession(session)) {
        setRecovery(null);
        setSaveState("idle");
      }
    } catch (error) {
      setProjectError(error instanceof Error ? error.message : String(error));
    }
  }, [applySession, confirmReplaceCurrentProject]);

  const openProject = useCallback(async (): Promise<void> => {
    if (!window.motioner || !confirmReplaceCurrentProject()) return;
    try {
      const result = await window.motioner.openProject();
      if (!result.cancelled && applySession(result.session)) setRecovery(null);
    } catch (error) {
      setProjectError(error instanceof Error ? error.message : String(error));
    }
  }, [applySession, confirmReplaceCurrentProject]);

  const saveProject = useCallback(async (saveAs = false): Promise<boolean> => {
    if (!window.motioner) return false;
    setSaveState("saving");
    setSaveDetail(saveAs ? "正在另存项目" : "正在保存项目");
    try {
      const result = saveAs
        ? await window.motioner.saveProjectAs({project})
        : await window.motioner.saveProject({project});
      if (result.cancelled) {
        setSaveState(dirty ? "dirty" : "idle");
        setSaveDetail(dirty ? "有未保存更改" : "已取消保存");
        return false;
      } else {
        return applySession(result.session);
      }
    } catch (error) {
      setSaveState("error");
      setSaveDetail("项目保存失败");
      setProjectError(error instanceof Error ? error.message : String(error));
      return false;
    }
  }, [applySession, dirty, project]);

  const handleMenuCommand = useCallback((command: MenuCommand): void => {
    if (command === "new") void newProject();
    if (command === "open") void openProject();
    if (command === "save") void saveProject(false);
    if (command === "save-as") void saveProject(true);
  }, [newProject, openProject, saveProject]);

  useEffect(() => {
    document.title = `${dirty ? "• " : ""}${project.name} - Motioner`;
  }, [dirty, project.name]);

  useEffect(() => window.motioner?.setProjectDirty(dirty), [dirty]);

  useEffect(() => window.motioner?.onSaveBeforeClose(() => saveProject(false)), [saveProject]);
  useEffect(() => window.motioner?.onRequestProjectClose(requestProjectCloseDecision), [requestProjectCloseDecision]);

  useEffect(() => window.localStorage.setItem("motioner.favorites", JSON.stringify(favorites)), [favorites]);
  useEffect(() => window.localStorage.setItem("motioner.recentTemplates", JSON.stringify(recentTemplates)), [recentTemplates]);
  useEffect(() => window.localStorage.setItem("motioner.parameterPresets", JSON.stringify(parameterPresets)), [parameterPresets]);
  useEffect(() => window.localStorage.setItem("motioner.renderJobs", JSON.stringify(renderJobs)), [renderJobs]);
  useEffect(() => window.localStorage.setItem("motioner.shortcuts", JSON.stringify(shortcutBindings)), [shortcutBindings]);

  useEffect(() => {
    const player = playerRef.current;
    if (!player) return;
    const update = (event: {detail: {frame: number}}): void => setCurrentFrame(event.detail.frame);
    const playing = (): void => setIsPlaying(true);
    const paused = (): void => setIsPlaying(false);
    player.addEventListener("frameupdate", update);
    player.addEventListener("play", playing);
    player.addEventListener("pause", paused);
    player.addEventListener("ended", paused);
    setIsPlaying(player.isPlaying());
    return () => {
      player.removeEventListener("frameupdate", update);
      player.removeEventListener("play", playing);
      player.removeEventListener("pause", paused);
      player.removeEventListener("ended", paused);
    };
  }, [project.editorMode, project.id, project.template.id]);

  useEffect(() => window.motioner?.onMenuCommand(handleMenuCommand), [handleMenuCommand]);

  useEffect(() => {
    void (async () => {
      try {
        const snapshot = await window.motioner?.getRecovery();
        if (snapshot) {
          setRecovery(snapshot);
          return;
        }
        const lastProject = await window.motioner?.getLastProject();
        if (lastProject) applySession(lastProject);
      } catch (error) {
        setProjectError(error instanceof Error ? error.message : String(error));
      }
    })();
  }, [applySession]);

  useEffect(() => {
    if (!dirty || !window.motioner) return;
    const timer = window.setTimeout(() => {
      void window.motioner?.autosaveProject({project}).catch((error: unknown) => {
        setSaveState("error");
        setSaveDetail("自动恢复快照写入失败");
        setProjectError(error instanceof Error ? error.message : String(error));
      });
    }, 8_000);
    return () => window.clearTimeout(timer);
  }, [dirty, project]);

  useEffect(() => window.motioner?.onRenderEvent((event) => {
    setRenderJobs((current) => current.map((job) => {
      if (event.jobId !== job.jobId) return job;
      if (event.type === "progress") return {
        ...job,
        status: event.stage === "queued" ? "queued" : "rendering",
        progress: event.progress,
        detail: getStageLabel(event, job.project.canvas.durationInFrames),
      };
      if (event.type === "complete") return {
        ...job,
        status: "complete",
        progress: 1,
        detail: event.validation.summary,
        outputLocation: event.outputLocation,
        validation: event.validation,
      };
      return {
        ...job,
        status: event.cancelled ? "cancelled" : "error",
        detail: event.cancelled ? "已取消导出" : event.message,
      };
    }));
  }), []);

  const updateProp = (key: string, value: unknown): void =>
    markChanged({...project, props: {...project.props, [key]: value}});

  const updateCanvas = (patch: Partial<MotionProject["canvas"]>): void =>
    markChanged({
      ...project,
      canvas: {...project.canvas, ...patch},
      composition: patch.durationInFrames === undefined ? project.composition : {
        ...project.composition,
        nodes: project.composition.nodes.map((node) => {
          const from = Math.min(node.timing.from, Math.max(0, patch.durationInFrames! - 1));
          return {...node, timing: {from, durationInFrames: Math.max(1, Math.min(node.timing.durationInFrames, patch.durationInFrames! - from))}};
        }),
      },
      timeSlots: patch.durationInFrames === undefined ? project.timeSlots : project.timeSlots.map((slot) => ({
        ...slot,
        frame: Math.min(slot.frame, Math.max(0, patch.durationInFrames! - 1)),
      })),
      segments: patch.durationInFrames === undefined ? project.segments : project.segments
        .filter(() => patch.durationInFrames! > 1)
        .map((segment) => ({...segment, frame: Math.min(segment.frame, patch.durationInFrames! - 1)}))
        .filter((segment, index, all) => all.findIndex((candidate) => candidate.frame === segment.frame) === index)
        .sort((a, b) => a.frame - b.frame),
    });

  const updateAnimation = (patch: Partial<MotionProject["animation"]>): void =>
    markChanged({...project, animation: {...project.animation, ...patch}});

  const commitComposition = (composition: ComposerComposition): void => {
    setComposerPreview(null);
    markChanged({...project, composition});
  };

  const addComposerComponent = (componentId: ComposerComponentId, position?: {x: number; y: number}): void => {
    const zIndex = Math.max(-1, ...project.composition.nodes.map((node) => node.transform.zIndex)) + 1;
    const node = createComposerNode(componentId, globalThis.crypto.randomUUID(), project.canvas.durationInFrames, zIndex);
    if (position) {
      const placed = placeRectAtPoint(position, node.transform);
      node.transform.x = placed.x;
      node.transform.y = placed.y;
    }
    if (componentId === "template") {
      node.name = manifest.name;
      node.props = {templateId: manifest.id, templateProps: structuredClone(project.props)};
      node.motion.enter = "none";
      node.motion.exit = "none";
    }
    markChanged({...project, editorMode: "composer", composition: {...project.composition, nodes: [...project.composition.nodes, node]}});
    selectNodeOnly(node.id);
    playerRef.current?.seekTo(node.timing.from);
  };

  const enterComposerMode = (): void => {
    if (project.composition.nodes.length > 0) {
      markChanged({...project, editorMode: "composer"});
      selectNodeOnly(project.composition.nodes.at(-1)?.id ?? null);
      return;
    }
    const node = createComposerNode("template", globalThis.crypto.randomUUID(), project.canvas.durationInFrames, 0);
    node.name = manifest.name;
    node.props = {templateId: manifest.id, templateProps: structuredClone(project.props)};
    node.motion.enter = "none";
    node.motion.exit = "none";
    markChanged({...project, editorMode: "composer", composition: {...project.composition, nodes: [node]}});
    selectNodeOnly(node.id);
  };

  const updateSelectedNode = (node: ComposerNode): void => {
    commitComposition({...project.composition, nodes: project.composition.nodes.map((candidate) => candidate.id === node.id ? node : candidate)});
  };

  const selectNodeOnly = (nodeId: string | null): void => {
    setSelectedNodeId(nodeId);
    setMultiSelectedIds(nodeId ? [nodeId] : []);
  };

  const selectNodeExtend = (nodeId: string, extend: boolean): void => {
    setSelectedNodeId(nodeId);
    if (!extend) {
      setMultiSelectedIds([nodeId]);
      return;
    }
    setMultiSelectedIds((current) => current.includes(nodeId)
      ? current.filter((id) => id !== nodeId)
      : [...current, nodeId]);
  };

  const deleteSelectedNodes = (ripple = false): void => {
    const ids = multiSelectedIds.length > 0
      ? multiSelectedIds
      : selectedNodeId
        ? [selectedNodeId]
        : [];
    if (ids.length === 0) return;
    const allNodes = project.composition.nodes;
    let remaining = allNodes.filter((node) => !ids.includes(node.id));
    if (ripple) {
      // 波纹删除:被删图层按起始帧从小到大处理,其后开始的图层左移被删时长。
      const removed = allNodes
        .filter((node) => ids.includes(node.id))
        .sort((a, b) => a.timing.from - b.timing.from);
      for (const target of removed) {
        remaining = remaining.map((node) => node.timing.from >= target.timing.from
          ? {...node, timing: {...node.timing, from: Math.max(0, node.timing.from - target.timing.durationInFrames)}}
          : node);
      }
    }
    commitComposition({...project.composition, nodes: remaining});
    const next = remaining.sort((a, b) => a.transform.zIndex - b.transform.zIndex).at(-1);
    selectNodeOnly(next?.id ?? null);
  };

  const deleteSelectedNode = (): void => {
    deleteSelectedNodes(false);
  };

  const deleteSelectedNodesRipple = (): void => {
    deleteSelectedNodes(true);
  };

  const addTimeSlot = (): void => {
    const slot: TimeSlot = {
      id: globalThis.crypto.randomUUID(),
      label: `标记 ${project.timeSlots.length + 1}`,
      frame: currentFrame,
    };
    markChanged({...project, timeSlots: [...project.timeSlots, slot]});
  };

  const updateTimeSlotFrame = (slotId: string, frame: number): void => {
    markChanged({...project, timeSlots: project.timeSlots.map((slot) => slot.id === slotId ? {...slot, frame: Math.max(0, Math.round(frame))} : slot)});
  };

  const removeTimeSlot = (slotId: string): void => {
    markChanged({...project, timeSlots: project.timeSlots.filter((slot) => slot.id !== slotId)});
  };

  const addSegment = (): void => {
    const frame = Math.max(1, Math.min(project.canvas.durationInFrames - 1, currentFrame));
    if (project.segments.some((segment) => segment.frame === frame)) return;
    const next: Segment[] = [
      ...project.segments,
      {id: globalThis.crypto.randomUUID(), label: `段 ${project.segments.length + 2}`, frame},
    ].sort((a, b) => a.frame - b.frame);
    markChanged({...project, segments: next});
  };

  const updateSegmentFrame = (segmentId: string, frame: number): void => {
    const nextFrame = Math.max(1, Math.min(project.canvas.durationInFrames - 1, Math.round(frame)));
    if (project.segments.some((segment) => segment.id !== segmentId && segment.frame === nextFrame)) return;
    markChanged({
      ...project,
      segments: project.segments
        .map((segment) => segment.id === segmentId ? {...segment, frame: nextFrame} : segment)
        .sort((a, b) => a.frame - b.frame),
    });
  };

  const removeSegment = (segmentId: string): void => {
    markChanged({...project, segments: project.segments.filter((segment) => segment.id !== segmentId)});
  };

  const duplicateSelectedNode = (): void => {
    const source = project.composition.nodes.find((node) => node.id === selectedNodeId);
    if (!source) return;
    const copy = structuredClone(source);
    copy.id = globalThis.crypto.randomUUID();
    copy.name = `${source.name} 副本`;
    copy.transform.x = Math.min(1 - copy.transform.width, copy.transform.x + 0.025);
    copy.transform.y = Math.min(1 - copy.transform.height, copy.transform.y + 0.025);
    copy.transform.zIndex = Math.max(-1, ...project.composition.nodes.map((node) => node.transform.zIndex)) + 1;
    commitComposition({...project.composition, nodes: [...project.composition.nodes, copy]});
    selectNodeOnly(copy.id);
  };

  const moveSelectedLayer = (direction: "front" | "back" | "up" | "down"): void => {
    if (!selectedNodeId) return;
    const ordered = [...project.composition.nodes].sort((a, b) => a.transform.zIndex - b.transform.zIndex);
    const index = ordered.findIndex((node) => node.id === selectedNodeId);
    if (index < 0) return;
    const target = direction === "front" ? ordered.length - 1 : direction === "back" ? 0 : direction === "up" ? Math.min(ordered.length - 1, index + 1) : Math.max(0, index - 1);
    const [node] = ordered.splice(index, 1);
    if (!node) return;
    ordered.splice(target, 0, node);
    commitComposition({...project.composition, nodes: ordered.map((candidate, zIndex) => ({...candidate, transform: {...candidate.transform, zIndex}}))});
  };

  const applyMotionPresetToNode = (nodeId: string, presetId: ComposerMotionPresetId, phase: "enter" | "exit" | "loop"): void => {
    const node = project.composition.nodes.find((candidate) => candidate.id === nodeId);
    if (!node) return;
    const easingPatch = presetId === "pop" && phase === "enter"
      ? {enterEasing: "spring-snappy" as const}
      : presetId === "pop" && phase === "exit"
        ? {exitEasing: "spring-smooth" as const}
        : {};
    selectNodeOnly(node.id);
    commitComposition({...project.composition, nodes: project.composition.nodes.map((candidate) => candidate.id === node.id ? {...node, motion: {...node.motion, [phase]: presetId, ...easingPatch}} : candidate)});
    const previewFrame = phase === "exit"
      ? Math.max(node.timing.from, node.timing.from + node.timing.durationInFrames - node.motion.exitDuration - 1)
      : phase === "loop"
        ? node.timing.from + Math.floor(node.timing.durationInFrames / 2)
        : node.timing.from;
    playerRef.current?.seekTo(previewFrame);
  };

  const pickComposerMedia = async (field: Extract<InspectorField, {control: "media"}>): Promise<void> => {
    const node = project.composition.nodes.find((candidate) => candidate.id === selectedNodeId);
    if (!node) return;
    const asset = await window.motioner?.selectMedia({accept: [...field.accept]});
    if (!asset) return;
    markChanged({
      ...project,
      composition: {...project.composition, nodes: project.composition.nodes.map((candidate) => candidate.id === node.id ? {...candidate, props: {...candidate.props, [field.key]: asset.id}} : candidate)},
      assets: [...project.assets.filter((candidate) => candidate.id !== asset.id), asset],
    });
  };

  const togglePlayback = useCallback((): void => {
    const player = playerRef.current;
    if (!player) return;
    if (player.isPlaying()) player.pause();
    else {
      if (project.editorMode === "template" && currentFrame >= project.canvas.durationInFrames - 1) player.seekTo(0);
      player.play();
    }
  }, [currentFrame, project.canvas.durationInFrames, project.editorMode]);

  const playTemplateOnce = useCallback((): void => {
    if (project.editorMode !== "template") return;
    playerRef.current?.seekTo(0);
    playerRef.current?.play();
  }, [project.editorMode]);

  useEffect(() => {
    if (project.editorMode !== "template" || pendingTemplatePlaybackRef.current !== project.template.id) return;
    pendingTemplatePlaybackRef.current = null;
    const animationFrame = window.requestAnimationFrame(() => {
      playerRef.current?.seekTo(0);
      playerRef.current?.play();
    });
    return () => window.cancelAnimationFrame(animationFrame);
  }, [project.editorMode, project.template.id]);

  const beginTimelineScrub = useCallback((): void => {
    const player = playerRef.current;
    scrubWasPlayingRef.current = player?.isPlaying() ?? false;
    player?.pause();
  }, []);

  const seekTimelineFrame = useCallback((frame: number): void => {
    const lastFrame = Math.max(0, project.canvas.durationInFrames - 1);
    playerRef.current?.seekTo(Math.min(lastFrame, Math.max(0, Math.round(frame))));
  }, [project.canvas.durationInFrames]);

  const endTimelineScrub = useCallback((): void => {
    if (scrubWasPlayingRef.current) playerRef.current?.play();
    scrubWasPlayingRef.current = false;
  }, []);

  const nudgeSelectedNode = (dx: number, dy: number): void => {
    if (!selectedNodeId) return;
    const node = project.composition.nodes.find((candidate) => candidate.id === selectedNodeId);
    if (!node || node.locked) return;
    const x = Math.min(Math.max(0, 1 - node.transform.width), Math.max(0, node.transform.x + dx));
    const y = Math.min(Math.max(0, 1 - node.transform.height), Math.max(0, node.transform.y + dy));
    commitComposition({...project.composition, nodes: project.composition.nodes.map((candidate) => candidate.id === node.id ? {...node, transform: {...node.transform, x, y}} : candidate)});
  };

  shortcutActionsRef.current = {
    "toggle-playback": togglePlayback,
    "previous-frame": () => seekTimelineFrame(currentFrame - 1),
    "next-frame": () => seekTimelineFrame(currentFrame + 1),
    "timeline-start": () => seekTimelineFrame(0),
    "timeline-end": () => seekTimelineFrame(project.canvas.durationInFrames - 1),
    "add-marker": addTimeSlot,
    "add-segment": addSegment,
    "duplicate-layer": duplicateSelectedNode,
    "delete-layer": () => deleteSelectedNodes(false),
    "ripple-delete": deleteSelectedNodesRipple,
    "save-project": () => {void saveProject(false);},
    undo: undoProject,
    redo: redoProject,
    "nudge-left": () => nudgeSelectedNode(-0.005, 0),
    "nudge-right": () => nudgeSelectedNode(0.005, 0),
    "nudge-up": () => nudgeSelectedNode(0, -0.005),
    "nudge-down": () => nudgeSelectedNode(0, 0.005),
    "nudge-left-large": () => nudgeSelectedNode(-0.025, 0),
    "nudge-right-large": () => nudgeSelectedNode(0.025, 0),
    "nudge-up-large": () => nudgeSelectedNode(0, -0.025),
    "nudge-down-large": () => nudgeSelectedNode(0, 0.025),
  };

  useEffect(() => {
    const handleShortcut = (event: KeyboardEvent): void => {
      if (isEditableShortcutTarget(event.target)) return;
      const command = findShortcutCommand(event, shortcutBindings);
      if (!command) return;
      const composerOnly = ["add-marker", "add-segment", "duplicate-layer", "delete-layer", "ripple-delete", "nudge-left", "nudge-right", "nudge-up", "nudge-down", "nudge-left-large", "nudge-right-large", "nudge-up-large", "nudge-down-large"].includes(command);
      if (composerOnly && project.editorMode !== "composer") return;
      const repeatable = ["previous-frame", "next-frame", "nudge-left", "nudge-right", "nudge-up", "nudge-down", "nudge-left-large", "nudge-right-large", "nudge-up-large", "nudge-down-large"].includes(command);
      if (event.repeat && !repeatable) return;
      event.preventDefault();
      shortcutActionsRef.current[command]?.();
    };
    window.addEventListener("keydown", handleShortcut);
    return () => window.removeEventListener("keydown", handleShortcut);
  }, [project.editorMode, shortcutBindings]);

  useEffect(() => {
    if (project.editorMode !== "composer") return;
    // 点击与“选中节点操作”无关的区域时清除选中，避免状态残留。时间线必须
    // 整体保留：拖动素材条时根节点接管 pointer capture，后续 click 的 target 会
    // 被重定向到时间线根节点；若这里只保留行/工具栏，素材条刚选中就会再次清空。
    const handleClick = (event: MouseEvent): void => {
      const target = event.target as HTMLElement | null;
      if (!target) return;
      if (shouldPreserveComposerSelection(event.composedPath())) return;
      setSelectedNodeId(null);
      setMultiSelectedIds([]);
    };
    document.addEventListener("click", handleClick, true);
    return () => document.removeEventListener("click", handleClick, true);
  }, [project.editorMode]);

  const selectTemplate = (templateId: string): void => {
    setRecentTemplates((current) => [templateId, ...current.filter((id) => id !== templateId)].slice(0, 8));
    setTemplateInspectorView("edit");
    if (getTemplateSelectionAction(project.template.id, templateId) === "replay") {
      playTemplateOnce();
      return;
    }
    const nextManifest = getTemplateManifest(templateId);
    pendingTemplatePlaybackRef.current = templateId;
    markChanged({
      ...project,
      template: {id: nextManifest.id, version: nextManifest.version},
      props: {...nextManifest.defaultProps},
      assets: project.composition.nodes.length > 0 ? project.assets : project.assets.filter((asset) => asset.kind === "font"),
    });
  };

  const changeFrameRate = (value: string): void => {
    const preset = FRAME_RATE_PRESETS.find((candidate) => frameRateKey(candidate.value) === value);
    if (!preset) return;
    const ratio = getFrameRate(preset.value) / fps;
    const durationInFrames = secondsToFrames(durationSeconds, preset.value);
    markChanged({
      ...project,
      canvas: {...project.canvas, fps: {...preset.value}, durationInFrames},
      composition: {
        ...project.composition,
        nodes: project.composition.nodes.map((node) => {
          const from = Math.min(durationInFrames - 1, Math.max(0, Math.round(node.timing.from * ratio)));
          return {...node, timing: {from, durationInFrames: Math.max(1, Math.min(durationInFrames - from, Math.round(node.timing.durationInFrames * ratio)))}};
        }),
      },
    });
  };

  const pickMedia = async (field: MediaInspectorField): Promise<void> => {
    const asset = await window.motioner?.selectMedia({accept: [...field.accept]});
    if (!asset) return;
    markChanged({
      ...project,
      props: {...project.props, [field.key]: asset.id},
      assets: [...project.assets.filter((candidate) => candidate.id !== asset.id), asset],
    });
  };

  const collectProjectAssets = async (): Promise<void> => {
    if (!window.motioner) return;
    try {
      const result = await window.motioner.collectProjectAssets({project});
      if (result.cancelled) return;
      if (result.copied === 0) {
        setSaveDetail("当前项目没有需要收集的素材");
        return;
      }
      markChanged(result.project);
      setSaveDetail(`已收集 ${result.copied} 个素材`);
    } catch (error) {
      setProjectError(error instanceof Error ? error.message : String(error));
    }
  };

  const relinkProjectAssets = async (mode: "files" | "folder"): Promise<void> => {
    if (!window.motioner) return;
    try {
      const result = await window.motioner.relinkProjectAssets({project, mode});
      if (result.cancelled) return;
      if (result.relinked > 0) markChanged(result.project);
      setSaveDetail(result.unresolved.length
        ? `已重链 ${result.relinked} 个，仍缺失：${result.unresolved.join("、")}`
        : `已重新链接 ${result.relinked} 个素材`);
    } catch (error) {
      setProjectError(error instanceof Error ? error.message : String(error));
    }
  };

  const pickProjectFont = async (): Promise<void> => {
    const asset = await window.motioner?.selectFont();
    if (!asset) return;
    markChanged({
      ...project,
      assets: [...project.assets.filter((candidate) => candidate.id !== asset.id), asset],
      typography: {...project.typography, fontAssetId: asset.id},
    });
  };

  const choosePreviewBackgroundImage = async (): Promise<void> => {
    const asset = await window.motioner?.selectMedia({accept: ["image"]});
    if (!asset) return;
    setPreviewBackgroundImage(`file://${encodeURI(asset.path)}`);
    setPreviewBackground("image");
  };

  const saveParameterPreset = (): void => {
    const name = window.prompt("预设名称", `${manifest.name} · 自定义` )?.trim();
    if (!name) return;
    const preset: ParameterPreset = {
      id: globalThis.crypto.randomUUID(),
      name,
      templateId: manifest.id,
      props: structuredClone(project.props),
      canvas: structuredClone(project.canvas),
      animation: structuredClone(project.animation),
      exportPresetId: project.exportPresetId,
    };
    setParameterPresets((current) => [preset, ...current].slice(0, 40));
  };

  const applyParameterPreset = (presetId: string): void => {
    const preset = parameterPresets.find((candidate) => candidate.id === presetId);
    if (!preset || preset.templateId !== manifest.id) return;
    markChanged({...project, props: structuredClone(preset.props), canvas: structuredClone(preset.canvas), animation: structuredClone(preset.animation ?? project.animation), exportPresetId: preset.exportPresetId});
  };

  const exportParameterPresets = async (): Promise<void> => {
    if (!window.motioner || parameterPresets.length === 0) return;
    try {
      const saved = await window.motioner.exportParameterPresets({
        format: "motioner-presets",
        version: 1,
        exportedAt: new Date().toISOString(),
        presets: parameterPresets,
      });
      if (saved) setSaveDetail(`已导出 ${parameterPresets.length} 个参数预设`);
    } catch (error) {
      setProjectError(error instanceof Error ? error.message : String(error));
    }
  };

  const importParameterPresets = async (): Promise<void> => {
    try {
      const result = await window.motioner?.importParameterPresets();
      if (!result || result.cancelled) return;
      setParameterPresets((current) => {
        const merged = new Map(current.map((preset) => [preset.id, preset]));
        result.collection.presets.forEach((preset) => merged.set(preset.id, preset));
        return [...merged.values()].slice(0, 200);
      });
      setSaveDetail(`已导入 ${result.collection.presets.length} 个参数预设`);
    } catch (error) {
      setProjectError(error instanceof Error ? error.message : String(error));
    }
  };

  const importBatchCsv = async (file: File): Promise<void> => {
    try {
      const records = parseCsv(await file.text());
      if (records.length === 0) throw new Error("CSV 没有数据行");
      if (records.length > 100) throw new Error("单次批量导出最多支持 100 行");
      const headers = Object.keys(records[0] ?? {});
      setBatchDraft({fileName: file.name, records, headers, mappings: inferBatchMappings(headers, manifest), namingPattern: "{{project}}-{{index}}"});
    } catch (error) {
      setProjectError(error instanceof Error ? error.message : String(error));
    } finally {
      if (batchCsvRef.current) batchCsvRef.current.value = "";
    }
  };

  const startBatchProjects = async (projects: MotionProject[]): Promise<void> => {
    if (!window.motioner) return;
    try {
      const result = await window.motioner.startBatchRender({projects});
      if (result.cancelled) return;
      setRenderJobs((current) => [
        ...result.jobs.map((job, index): RenderJobState => ({
          jobId: job.jobId,
          project: projects[index],
          presetId: job.presetId,
          status: job.queuedAhead > 0 ? "queued" : "rendering",
          progress: 0,
          detail: job.queuedAhead > 0 ? `队列前有 ${job.queuedAhead} 个任务` : "正在启动独立渲染进程",
          outputLocation: job.outputLocation,
          validation: null,
        })),
        ...current,
      ].slice(0, 100));
      setBatchDraft(null);
    } catch (error) {
      setProjectError(error instanceof Error ? error.message : String(error));
    }
  };

  const restoreRecovery = async (): Promise<void> => {
    try {
      const session = await window.motioner?.restoreRecovery();
      if (session && applySession(session)) {
        setRecovery(null);
        setDirty(true);
        setSaveState("dirty");
        setSaveDetail(session.path ? "已恢复修改，尚未保存" : "已恢复未命名项目，请保存为文件");
      }
    } catch (error) {
      setProjectError(error instanceof Error ? error.message : String(error));
    }
  };

  const discardRecovery = async (): Promise<void> => {
    try {
      await window.motioner?.discardRecovery();
      setRecovery(null);
    } catch (error) {
      setProjectError(error instanceof Error ? error.message : String(error));
    }
  };

  const startRender = async (sourceProject: MotionProject = project): Promise<void> => {
    if (!window.motioner) return;
    try {
      const snapshot: MotionProject & {exportPresetId: ExportPresetId} = {
        ...structuredClone(sourceProject),
        exportPresetId: getExportPreset(sourceProject.exportPresetId).id,
      };
      const result = await window.motioner.startRender({project: snapshot});
      if (result.cancelled) {
        if (result.reason) setSaveDetail(result.reason);
        return;
      }
      const nextJob: RenderJobState = {
        jobId: result.jobId,
        project: snapshot,
        presetId: result.presetId,
        status: result.queuedAhead > 0 ? "queued" : "rendering",
        progress: 0,
        detail: result.queuedAhead > 0 ? `队列前有 ${result.queuedAhead} 个任务` : "正在启动独立渲染进程",
        outputLocation: result.outputLocation,
        validation: null,
      };
      setRenderJobs((current) => [nextJob, ...current].slice(0, 20));
    } catch (error) {
      setProjectError(error instanceof Error ? error.message : String(error));
    }
  };

  const previewProps = parsedProps.success ? parsedProps.data : manifest.defaultProps;

  return (
    <div className="app-shell">
      <header className="toolbar">
        <div className="window-spacer" aria-hidden="true" />
        <div className="brand-block">
          {/* eslint-disable-next-line @remotion/warn-native-media-tag -- editor chrome only, excluded from video renders */}
          <img className="brand-mark" src={motionerIcon} alt="" />
          <div className="brand-name">Motioner</div>
        </div>
        <div className="editor-mode-switch" role="tablist" aria-label="编辑模式">
          <button type="button" role="tab" aria-selected={project.editorMode === "template"} aria-controls="motioner-workbench" className={project.editorMode === "template" ? "active" : ""} title="模板：快速制作动效" onClick={() => project.editorMode !== "template" && markChanged({...project, editorMode: "template"})}>模板</button>
          <button type="button" role="tab" aria-selected={project.editorMode === "composer"} aria-controls="motioner-workbench" className={project.editorMode === "composer" ? "active" : ""} title="自由编排：专业动效制作" onClick={enterComposerMode}>自由编排</button>
        </div>
        <div className="file-actions" aria-label="项目文件操作">
          <button type="button" className="icon-btn" onClick={newProject} title="新建项目" aria-label="新建项目"><FilePlus /></button>
          <button type="button" className="icon-btn" onClick={openProject} title="打开项目" aria-label="打开项目"><FolderOpen /></button>
          <button type="button" className="icon-btn" onClick={() => void saveProject(false)} title="保存项目" aria-label="保存项目"><Save /></button>
          <button type="button" className="icon-btn" onClick={undoProject} disabled={undoStack.length === 0} title="撤销" aria-label="撤销"><Undo2 /></button>
          <button type="button" className="icon-btn" onClick={redoProject} disabled={redoStack.length === 0} title="重做" aria-label="重做"><Redo2 /></button>
        </div>
        <div className="shortcut-settings-anchor">
          <button type="button" className={`icon-btn toolbar-shortcut-button ${shortcutSettingsOpen ? "active" : ""}`} onClick={() => setShortcutSettingsOpen((open) => !open)} title="键盘快捷键设置" aria-label="键盘快捷键设置" aria-expanded={shortcutSettingsOpen}><Keyboard /></button>
          <ShortcutSettings open={shortcutSettingsOpen} bindings={shortcutBindings} onClose={() => setShortcutSettingsOpen(false)} onChange={setShortcutBindings} />
        </div>
        <div className="project-identity">
          {renamingProject ? <input
            ref={projectNameInputRef}
            className="project-name-input"
            aria-label="项目名称"
            value={projectNameDraft}
            maxLength={96}
            onChange={(event) => setProjectNameDraft(event.target.value)}
            onBlur={commitProjectRename}
            onKeyDown={(event) => {
              if (event.key === "Enter") event.currentTarget.blur();
              if (event.key === "Escape") {
                event.preventDefault();
                cancelProjectRename();
              }
            }}
          /> : <button type="button" className="project-name-button" onClick={beginProjectRename} title="重命名项目" aria-label={`重命名项目，当前名称 ${project.name}`}><strong>{project.name}</strong><Pencil aria-hidden="true" /></button>}
          <span className={`save-indicator save-${saveState}`} aria-hidden="true" /><span>{getProjectFileName(projectPath)}</span>
        </div>
        <OutputQuickSettings
          width={project.canvas.width}
          height={project.canvas.height}
          fps={project.canvas.fps}
          durationSeconds={durationSeconds}
          exportPresetId={selectedExportPreset.id}
          onDimensionCommit={(width, height) => updateCanvas({width, height})}
          onFrameRateChange={changeFrameRate}
          onDurationChange={(seconds) => updateCanvas({durationInFrames: secondsToFrames(seconds, project.canvas.fps)})}
          onExportPresetChange={(presetId) => markChanged({...project, exportPresetId: presetId})}
        />
        <button type="button" className="export-button" title={renderError ?? selectedExportPreset.description} aria-label={`导出 ${selectedExportPreset.shortLabel}`} onClick={() => void startRender()} disabled={!canRender}>
          {activeJobCount > 0 ? `加入队列 · ${selectedExportPreset.shortLabel}` : segmentedExportEnabled ? `分段导出 · ${selectedExportPreset.shortLabel}` : `导出 · ${selectedExportPreset.shortLabel}`}
        </button>
      </header>

      <main id="motioner-workbench" className={`workbench workbench-${project.editorMode}`}>
        {project.editorMode === "template"
          ? <TemplateLibrary selected={manifest} favorites={favorites} recentTemplates={recentTemplates} onSelect={selectTemplate} onToggleFavorite={(templateId) => setFavorites((current) => current.includes(templateId) ? current.filter((id) => id !== templateId) : [...current, templateId])} />
          : <ComponentLibrary onAdd={addComposerComponent} />}

        <section className={`canvas-panel ${project.editorMode === "composer" ? "composer-mode" : ""}`} aria-label="预览画布">
          <div className="canvas-toolbar">
            <div className="canvas-toolbar-copy"><h1>{project.editorMode === "composer" ? "自由编排画布" : "模板预览"}</h1><p>{project.editorMode === "composer" ? `${project.composition.nodes.length} 个图层 · 拖动定位，控制点缩放` : `${manifest.name} · ${manifest.description}`}</p></div>
            <div className="canvas-actions">
              <div className="canvas-action-group canvas-view-actions">
                <button type="button" className={`icon-btn ${safeArea ? "active" : ""}`} onClick={() => setSafeArea((current) => !current)} title="切换安全区" aria-label="切换安全区"><Scan /></button>
                <Select ariaLabel="预览背景" value={previewBackground} options={[{value: "checker", label: "棋盘格"}, {value: "black", label: "黑底"}, {value: "white", label: "白底"}, {value: "gray", label: "50% 灰"}, {value: "image", label: "剪辑截图"}]} onChange={(value) => setPreviewBackground(value as PreviewBackground)} />
                {previewBackground === "image" && <button type="button" className="icon-btn" onClick={() => void choosePreviewBackgroundImage()} title="选择剪辑截图" aria-label="选择剪辑截图"><Image /></button>}
                <Select ariaLabel="预览缩放" value={String(previewZoom)} options={[{value: "25", label: "25%"}, {value: "50", label: "50%"}, {value: "100", label: "100%"}]} onChange={(value) => setPreviewZoom(Number(value))} />
              </div>
              <div className="canvas-action-group canvas-performance-actions"><button type="button" className={previewLowQuality ? "active" : ""} onClick={() => setPreviewLowQuality((current) => !current)} title="低配预览：以一半分辨率渲染预览，导出不受影响">低配预览</button></div>
              {project.editorMode === "composer" && <div className="canvas-action-group canvas-scene-actions"><button type="button" className="icon-btn" onClick={() => addComposerComponent("template")} title="将当前模板加入画布"><LayoutTemplate />加入当前模板</button></div>}
              <span className="preview-status"><span className="status-dot" />同源预览</span>
            </div>
          </div>
          {project.editorMode === "composer" && composerScene.nodes.length === 0 && <div className="canvas-empty-hint"><strong>画布没有图层</strong><span>从左侧组件库添加文字、图形、数据或素材。</span></div>}
          <div className={`stage-wrap ${project.editorMode === "composer" ? "composer-stage-wrap" : ""}`}>
            <div className={`player-frame preview-background-${previewBackground}`} onClick={project.editorMode === "template" ? playTemplateOnce : undefined} role={project.editorMode === "template" ? "button" : undefined} tabIndex={project.editorMode === "template" ? 0 : undefined} onKeyDown={project.editorMode === "template" ? (event) => {if (event.key === "Enter") playTemplateOnce();} : undefined} aria-label={project.editorMode === "template" ? "点击从头播放一次模板预览" : undefined} style={{
              aspectRatio: `${project.canvas.width} / ${project.canvas.height}`,
              width: `calc(min(100cqw, 100cqh * ${project.canvas.width / project.canvas.height}) * ${previewZoom / 100})`,
              height: `calc(min(100cqh, 100cqw / ${project.canvas.width / project.canvas.height}) * ${previewZoom / 100})`,
            }}>
              {previewBackground === "image" && previewBackgroundImage && <>
                {/* eslint-disable-next-line @remotion/warn-native-media-tag -- editor-only backdrop, excluded from the composition */}
                <img className="preview-backdrop-image" src={previewBackgroundImage} alt="" />
              </>}
              <Player
                acknowledgeRemotionLicense
                ref={playerRef}
                component={MotionerComposition}
                durationInFrames={project.canvas.durationInFrames}
                compositionWidth={previewLowQuality ? Math.max(160, Math.round(project.canvas.width / 2)) : project.canvas.width}
                compositionHeight={previewLowQuality ? Math.max(120, Math.round(project.canvas.height / 2)) : project.canvas.height}
                fps={fps}
                inputProps={{mode: project.editorMode, templateId: manifest.id, templateProps: previewProps, composition: composerScene, assets: project.assets, motionSettings: project.animation, typography: project.typography, templateAppearance: project.templateAppearance}}
                controls={false}
                loop={project.editorMode === "composer"}
                clickToPlay={false}
                style={{width: "100%", aspectRatio: `${project.canvas.width} / ${project.canvas.height}`}}
              />
              {project.editorMode === "composer" && <ComposerCanvasOverlay composition={composerScene} selectedNodeId={selectedNodeId} currentFrame={currentFrame} onSelect={selectNodeOnly} onPreview={setComposerPreview} onCommit={commitComposition} onAdd={addComposerComponent} onApplyMotion={applyMotionPresetToNode} />}
              {safeArea && <div className="safe-area-overlay" aria-hidden="true"><span /></div>}
            </div>
          </div>
          {project.editorMode === "template" ? <div className="timeline-summary template-timeline-summary">
            <button type="button" className={`template-play-button ${isPlaying ? "active" : ""}`} onClick={togglePlayback} title="播放 / 暂停预览" aria-label={isPlaying ? "暂停预览" : "播放预览"}>{isPlaying ? <Pause /> : <Play />}{isPlaying ? "暂停" : "预览"}</button>
            <button type="button" className="icon-btn" onClick={() => {playerRef.current?.seekTo(0); playerRef.current?.play();}} title="从头预览" aria-label="从头预览"><RotateCcw /></button>
            <span className="template-timecode">{formatTimecode(currentFrame, project.canvas.fps)}</span>
            <label className="template-scrubber" style={{"--preview-progress": `${currentFrame / Math.max(1, project.canvas.durationInFrames - 1) * 100}%`} as React.CSSProperties}>
              <span className="sr-only">预览播放头</span>
              <span className={`timeline-track mode-${manifest.durationMode}`} aria-hidden="true"><span className="timeline-intro" /><span className="timeline-hold" /><span className="timeline-outro" /><i /></span>
              <input type="range" min={0} max={project.canvas.durationInFrames - 1} value={currentFrame} aria-valuetext={formatTimecode(currentFrame, project.canvas.fps)} data-tooltip="双击回到首帧" onDoubleClick={() => seekTimelineFrame(0)} onPointerDown={beginTimelineScrub} onChange={(event) => seekTimelineFrame(event.target.valueAsNumber)} onPointerUp={endTimelineScrub} onPointerCancel={endTimelineScrub} />
            </label>
            <span className="template-timecode template-timecode-end">{formatTimecode(project.canvas.durationInFrames - 1, project.canvas.fps)}</span>
            <span className="template-frame-count">{currentFrame + 1} / {project.canvas.durationInFrames} 帧</span>
          </div> : <ComposerTimeline composition={composerScene} selectedNodeId={selectedNodeId} multiSelectedIds={multiSelectedIds} timeSlots={project.timeSlots} currentFrame={currentFrame} durationInFrames={project.canvas.durationInFrames} fps={project.canvas.fps} isPlaying={isPlaying} onTogglePlayback={togglePlayback} onSelect={selectNodeExtend} onPreview={setComposerPreview} onCommit={commitComposition} onValidate={(scene) => validateComposerComposition(scene, project.assets, project.canvas.durationInFrames) === null} onDelete={deleteSelectedNode} onDeleteRipple={deleteSelectedNodesRipple} onDuplicate={duplicateSelectedNode} onMoveLayer={moveSelectedLayer} onSeekStart={beginTimelineScrub} onSeek={seekTimelineFrame} onSeekEnd={endTimelineScrub} onApplyMotion={applyMotionPresetToNode} onAddTimeSlot={addTimeSlot} onUpdateTimeSlotFrame={updateTimeSlotFrame} onRemoveTimeSlot={removeTimeSlot} segments={project.segments} onAddSegment={addSegment} onUpdateSegmentFrame={updateSegmentFrame} onRemoveSegment={removeSegment} />}
        </section>

        <aside className="inspector-panel" aria-label="参数检查器">
          <div className="panel-heading inspector-title"><div><h2>{project.editorMode === "composer" ? selectedNode?.name ?? "图层属性" : templateInspectorView === "edit" ? "快速编辑" : "导出设置"}</h2><p>{project.editorMode === "composer" ? selectedNode ? `${getTemplateManifest(project.template.id).name} · ${selectedNode.componentId}` : "选择图层后编辑属性" : `${manifest.name} · ${manifest.durationMode} · v${manifest.version}`}</p></div><span className="alpha-badge">{project.editorMode === "composer" ? "图层" : templateInspectorView === "edit" ? "模板" : "输出"}</span></div>
          {project.editorMode === "template" && <div className="inspector-view-tabs" role="tablist" aria-label="模板工作面板">
            <button type="button" role="tab" aria-selected={templateInspectorView === "edit"} className={templateInspectorView === "edit" ? "active" : ""} onClick={() => setTemplateInspectorView("edit")}>快速编辑</button>
            <button type="button" role="tab" aria-selected={templateInspectorView === "export"} className={templateInspectorView === "export" ? "active" : ""} onClick={() => setTemplateInspectorView("export")}>导出设置</button>
          </div>}
          <div className="inspector-scroll">
          {project.editorMode === "template"
            ? templateInspectorView === "edit" ? <div className="inspector-tab-panel" key="template-edit"><TemplateAppearanceEditor value={project.templateAppearance} onChange={(templateAppearance) => markChanged({...project, templateAppearance})} /><Inspector manifest={manifest} props={project.props} assets={project.assets} onChange={updateProp} onPickMedia={pickMedia} /></div> : null
            : <><ComposerInspector node={selectedNode} assets={project.assets} projectDurationInFrames={project.canvas.durationInFrames} view={composerInspectorView} onViewChange={setComposerInspectorView} onChange={updateSelectedNode} onPickMedia={pickComposerMedia} />{composerInspectorView === "basic" && <InspectorGroup title="场景" className="scene-editor"><label className="field"><span>背景</span><Select ariaLabel="场景背景" value={project.composition.backgroundColor === "transparent" ? "transparent" : "solid"} options={[{value: "transparent", label: "透明"}, {value: "solid", label: "纯色"}]} onChange={(value) => commitComposition({...project.composition, backgroundColor: value === "transparent" ? "transparent" : "#0B0E12"})} /></label>{project.composition.backgroundColor !== "transparent" && <label className="field"><span>背景颜色</span><div className="color-control"><input type="color" value={project.composition.backgroundColor} onChange={(event) => commitComposition({...project.composition, backgroundColor: event.target.value})} /><input value={project.composition.backgroundColor.toUpperCase()} onChange={(event) => commitComposition({...project.composition, backgroundColor: event.target.value})} /></div></label>}<label className="field inline-switch"><span>对齐网格</span><input className="switch-control" type="checkbox" checked={project.composition.snapToGrid} onChange={(event) => commitComposition({...project.composition, snapToGrid: event.target.checked})} /></label><label className="field"><span>网格间距</span><Select ariaLabel="网格间距" value={String(project.composition.gridSize)} options={[{value: "0.01", label: "1%"}, {value: "0.025", label: "2.5%"}, {value: "0.05", label: "5%"}, {value: "0.1", label: "10%"}]} onChange={(value) => commitComposition({...project.composition, gridSize: Number(value)})} /></label></InspectorGroup>}</>}
          {(project.editorMode === "composer" || templateInspectorView === "export") && <InspectorGroup title="字体" className="typography-editor"><label className="field"><span>默认字体风格</span><Select ariaLabel="默认字体风格" value={project.typography.fallbackFamily} options={[{value: "system", label: "系统无衬线"}, {value: "serif", label: "宋体 / 衬线"}, {value: "mono", label: "等宽字体"}]} onChange={(value) => markChanged({...project, typography: {...project.typography, fallbackFamily: value as MotionProject["typography"]["fallbackFamily"]}})} /></label><div className="font-picker"><button type="button" onClick={() => void pickProjectFont()}>{selectedFont ? "替换字体" : "导入字体…"}</button><span title={selectedFont?.path}>{selectedFont?.path.split(/[\\/]/).at(-1) ?? "未导入项目字体"}</span>{selectedFont && <button type="button" className="icon-btn" onClick={() => markChanged({...project, typography: {...project.typography, fontAssetId: ""}})} title="恢复默认字体"><RotateCcw />恢复默认</button>}</div><small className="field-help">字体会作为项目素材保存指纹；请确认拥有相应使用授权。</small></InspectorGroup>}
          {(project.editorMode === "composer" || templateInspectorView === "export") && <InspectorGroup title="全局动画" className="animation-editor"><label className="field"><span>速度</span><Select ariaLabel="全局动画速度" value={String(project.animation.speed)} options={[{value: "0.5", label: "0.5× 慢速"}, {value: "0.75", label: "0.75×"}, {value: "1", label: "1× 标准"}, {value: "1.25", label: "1.25×"}, {value: "1.5", label: "1.5×"}, {value: "2", label: "2× 快速"}]} onChange={(value) => updateAnimation({speed: Number(value)})} /></label><CompactPropertyRow label="边缘帧"><RangeNumberControl ariaLabel="入场退场边缘帧" value={project.animation.edgeFrames} min={6} max={90} resetValue={18} onChange={(edgeFrames) => updateAnimation({edgeFrames})} /></CompactPropertyRow><label className="field inline-switch"><span>减少动态（取消位移与数字滚动）</span><input className="switch-control" type="checkbox" checked={project.animation.reducedMotion} onChange={(event) => updateAnimation({reducedMotion: event.target.checked})} /></label></InspectorGroup>}
          {project.editorMode === "template" && templateInspectorView === "export" ? <InspectorGroup title="工作流与批量" className="preset-editor"><label className="field"><span>参数预设</span><Select ariaLabel="参数预设" value="" options={[{value: "", label: "选择已保存预设…"}, ...parameterPresets.filter((preset) => preset.templateId === manifest.id).map((preset) => ({value: preset.id, label: preset.name}))]} onChange={applyParameterPreset} /></label><div className="workflow-actions"><button type="button" onClick={saveParameterPreset}>保存当前参数</button><button type="button" onClick={() => void exportParameterPresets()} disabled={parameterPresets.length === 0}>导出预设</button><button type="button" onClick={() => void importParameterPresets()}>导入预设</button><button type="button" onClick={() => void collectProjectAssets()} disabled={project.assets.length === 0}>收集素材</button><button type="button" onClick={() => void relinkProjectAssets("files")} disabled={project.assets.length === 0}>重链文件</button><button type="button" onClick={() => void relinkProjectAssets("folder")} disabled={project.assets.length === 0}>扫描文件夹</button><button type="button" onClick={() => batchCsvRef.current?.click()}>CSV 批量生成</button><input ref={batchCsvRef} className="sr-only" type="file" accept=".csv,text/csv" onChange={(event) => {const file = event.target.files?.[0]; if (file) void importBatchCsv(file);}} /></div><small className="field-help">高级工具默认收纳在导出设置中；CSV 一次最多 100 行。</small></InspectorGroup> : project.editorMode === "composer" ? <InspectorGroup title="项目素材" className="preset-editor"><div className="workflow-actions"><button type="button" onClick={() => void collectProjectAssets()} disabled={project.assets.length === 0}>收集素材</button><button type="button" onClick={() => void relinkProjectAssets("files")} disabled={project.assets.length === 0}>重链文件</button><button type="button" onClick={() => void relinkProjectAssets("folder")} disabled={project.assets.length === 0}>扫描文件夹</button></div><small className="field-help">图片、视频与字体都保存在项目素材清单中，可集中收集或重新链接。</small></InspectorGroup> : null}
          {project.editorMode === "template" && templateInspectorView === "export" && batchDraft && <InspectorGroup title="批量生成" defaultOpen><BatchImportPanel draft={batchDraft} project={project} manifest={manifest} onChange={setBatchDraft} onClose={() => setBatchDraft(null)} onStart={startBatchProjects} /></InspectorGroup>}
          {(project.editorMode === "composer" || templateInspectorView === "export") && <InspectorGroup title="输出规格" className="output-editor" defaultOpen={project.editorMode === "template"}>
            <ResolutionSettings width={project.canvas.width} height={project.canvas.height} onCommit={(width, height) => updateCanvas({width, height})} />
            <label className="field"><span>帧率</span><Select ariaLabel="导出帧率" value={frameRateKey(project.canvas.fps)} options={FRAME_RATE_PRESETS.map((preset) => ({value: frameRateKey(preset.value), label: `${preset.label} fps`}))} onChange={changeFrameRate} /></label>
            <DurationInput seconds={durationSeconds} frames={project.canvas.durationInFrames} onCommit={(seconds) => updateCanvas({durationInFrames: secondsToFrames(seconds, project.canvas.fps)})} />
            <label className="field"><span>导出格式</span><Select ariaLabel="导出格式" value={project.exportPresetId} options={EXPORT_PRESETS.map((preset) => ({value: preset.id, label: preset.label}))} onChange={(value) => markChanged({...project, exportPresetId: getExportPreset(value).id})} /><small className="field-help">{selectedExportPreset.description}</small></label>
            <label className="field inline-switch"><span>分段导出</span><input className="switch-control" type="checkbox" checked={project.exportOptions.segmented} disabled={!segmentedExportAvailable} onChange={(event) => markChanged({...project, exportOptions: {...project.exportOptions, segmented: event.target.checked}})} /><small className="field-help">{selectedExportPreset.kind !== "video" ? "仅视频格式支持多文件分段导出" : project.segments.length === 0 ? "先在时间线播放头位置添加分段点" : `将输出 ${project.segments.length + 1} 个视频和 sections.json`}</small></label>
            <label className="field"><span>目标重名时</span><Select ariaLabel="目标重名处理" value={project.exportOptions.conflictPolicy} options={[{value: "version", label: "自动追加版本号"}, {value: "replace", label: "验证成功后替换"}, {value: "skip", label: "跳过，不生成"}]} onChange={(value) => markChanged({...project, exportOptions: {...project.exportOptions, conflictPolicy: value as MotionProject["exportOptions"]["conflictPolicy"]}})} /></label>
            <dl className="output-summary"><div><dt>色彩空间</dt><dd>Rec.709 SDR</dd></div><div><dt>透明通道</dt><dd>{selectedExportPreset.alpha ? "保留" : "不包含（深色审看底）"}</dd></div><div><dt>输出</dt><dd>{segmentedExportEnabled ? `${project.segments.length + 1} 个分段文件` : "1 个完整文件"}</dd></div><div><dt>预计空间</dt><dd>约 {formatBytes(estimateExportBytes(project, selectedExportPreset.id))}</dd></div></dl>
          </InspectorGroup>}
          </div>
          {project.editorMode === "template" ? <div className="inspector-action-bar">
            <div><strong>{templateInspectorView === "edit" ? "修改即实时预览" : selectedExportPreset.label}</strong><span>{templateInspectorView === "edit" ? `${manifest.fields.length} 项可编辑参数` : `预计约 ${formatBytes(estimateExportBytes(project, selectedExportPreset.id))}`}</span></div>
            <button type="button" className="inspector-secondary-action" onClick={() => {playerRef.current?.seekTo(0); playerRef.current?.play();}} title="从头播放当前模板"><Play />预览</button>
            <button type="button" className="inspector-primary-action" onClick={() => void startRender()} disabled={!canRender} title={renderError ?? selectedExportPreset.description}><Download />导出</button>
          </div> : <div className="inspector-action-bar composer-inspector-actions">
            <div><strong>{selectedNode ? selectedNode.name : "未选择图层"}</strong><span>{multiSelectedIds.length > 1 ? `已选择 ${multiSelectedIds.length} 个图层` : selectedNode ? "方向键微调 · Shift 加速" : "从画布或时间线选择"}</span></div>
            <button type="button" className="inspector-secondary-action" onClick={duplicateSelectedNode} disabled={!selectedNodeId} title="复制选中图层" aria-label="复制选中图层"><Copy /></button>
            <button type="button" className="inspector-danger-action" onClick={deleteSelectedNode} disabled={!selectedNodeId} title="删除选中图层" aria-label="删除选中图层"><Trash2 /></button>
          </div>}
        </aside>
      </main>

      <footer className="status-bar">
        <span>{project.editorMode === "composer" ? `Composer：${project.composition.nodes.length} 个图层` : `模板：${manifest.id} ${manifest.version}`}</span>
        <span className={`status-message status-${renderError ? "error" : saveState}`}>{renderError ?? (activeJobCount > 0 ? `${activeJobCount} 个导出任务正在处理` : saveDetail)}</span>
        <span>{formatTimecode(project.canvas.durationInFrames - 1, project.canvas.fps)} · Rec.709</span>
      </footer>

      {recovery && <section className="recovery-banner" aria-live="polite"><div><strong>发现自动恢复项目</strong><span>{recovery.project.name} · {new Date(recovery.savedAt).toLocaleString("zh-CN")}</span></div><div className="recovery-actions"><button type="button" className="icon-btn" onClick={() => void discardRecovery()} title="忽略并清除恢复项目" aria-label="忽略"><X /></button><button type="button" className="recovery-primary" onClick={() => void restoreRecovery()}>恢复</button></div></section>}
      {projectError && <section className="project-error" aria-live="assertive"><div><strong>项目操作失败</strong><span>{projectError}</span></div><button type="button" className="icon-btn" onClick={() => setProjectError(null)} title="关闭提示" aria-label="关闭"><X /></button></section>}
      <RenderQueuePanel jobs={renderJobs} onClear={() => setRenderJobs((current) => current.filter((job) => job.status === "queued" || job.status === "rendering"))} onRetry={(job) => void startRender(job.project)} />
      <CloseProjectDialog open={closeDialogOpen} projectName={project.name} onDecision={resolveProjectCloseDecision} />
      <GlobalTooltip />
    </div>
  );
};
