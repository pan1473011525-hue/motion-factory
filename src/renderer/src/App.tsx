import {Player, type PlayerRef} from "@remotion/player";
import {
  ChevronLeft,
  ChevronRight,
  FilePlus,
  FolderOpen,
  Image,
  LayoutTemplate,
  Pause,
  Play,
  Redo2,
  RotateCcw,
  Save,
  Scan,
  SkipBack,
  SkipForward,
  Undo2,
  X,
} from "lucide-react";
import {useCallback, useEffect, useRef, useState} from "react";
import {
  CANVAS_PRESETS,
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
import type {RenderJobState} from "./render-job";
import {TemplateLibrary} from "./TemplateLibrary";
import {ComponentLibrary} from "./ComponentLibrary";
import {ComposerCanvasOverlay} from "./ComposerCanvasOverlay";
import {ComposerInspector} from "./ComposerInspector";
import {ComposerTimeline} from "./ComposerTimeline";
import {OutputQuickSettings} from "./OutputQuickSettings";
import {DimensionInput} from "./DimensionInput";
import motionerIcon from "./assets/motioner-icon.png";

type SaveState = "idle" | "dirty" | "saving" | "saved" | "recovery" | "error";
type PreviewBackground = "checker" | "black" | "white" | "gray" | "image";

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
}> = ({seconds, frames, onCommit}) => {
  const [draft, setDraft] = useState(seconds.toFixed(3));
  useEffect(() => setDraft(seconds.toFixed(3)), [seconds]);

  const commit = (): void => {
    const value = Number(draft);
    if (Number.isFinite(value) && value > 0) onCommit(value);
    else setDraft(seconds.toFixed(3));
  };

  return (
    <label className="field">
      <span>目标时长（秒）</span>
      <input
        type="number"
        min={0.1}
        max={7200}
        step={0.1}
        value={draft}
        onChange={(event) => setDraft(event.target.value)}
        onBlur={commit}
        onKeyDown={(event) => {
          if (event.key === "Enter") event.currentTarget.blur();
        }}
      />
      <small className="field-help">实际 {seconds.toFixed(4)} 秒 · {frames} 帧</small>
    </label>
  );
};

export const App: React.FC = () => {
  const [project, setProject] = useState<MotionProject>(makeInitialProject);
  const [undoStack, setUndoStack] = useState<MotionProject[]>([]);
  const [redoStack, setRedoStack] = useState<MotionProject[]>([]);
  const [projectPath, setProjectPath] = useState<string | null>(null);
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
  const revisionRef = useRef(0);
  const playerRef = useRef<PlayerRef>(null);
  const scrubWasPlayingRef = useRef(false);
  const batchCsvRef = useRef<HTMLInputElement>(null);

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

  const applySession = useCallback((session: ProjectSession): boolean => {
    try {
      const upgraded = upgradeProjectTemplate(session.project);
      revisionRef.current += 1;
      setProject(upgraded);
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
      ? "项目正在自动保存。仍要切换到另一个项目吗？"
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

  const saveProject = useCallback(async (saveAs = false): Promise<void> => {
    if (!window.motioner) return;
    setSaveState("saving");
    setSaveDetail(saveAs ? "正在另存项目" : "正在保存项目");
    try {
      const result = saveAs
        ? await window.motioner.saveProjectAs({project})
        : await window.motioner.saveProject({project});
      if (result.cancelled) {
        setSaveState(dirty ? "dirty" : "idle");
        setSaveDetail(dirty ? "有未保存更改" : "已取消保存");
      } else {
        applySession(result.session);
      }
    } catch (error) {
      setSaveState("error");
      setSaveDetail("项目保存失败");
      setProjectError(error instanceof Error ? error.message : String(error));
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

  useEffect(() => window.localStorage.setItem("motioner.favorites", JSON.stringify(favorites)), [favorites]);
  useEffect(() => window.localStorage.setItem("motioner.recentTemplates", JSON.stringify(recentTemplates)), [recentTemplates]);
  useEffect(() => window.localStorage.setItem("motioner.parameterPresets", JSON.stringify(parameterPresets)), [parameterPresets]);
  useEffect(() => window.localStorage.setItem("motioner.renderJobs", JSON.stringify(renderJobs)), [renderJobs]);

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
    const revision = revisionRef.current;
    const timer = window.setTimeout(() => {
      setSaveState("saving");
      setSaveDetail("正在自动保存");
      void window.motioner?.autosaveProject({project}).then((result) => {
        if (revision !== revisionRef.current) return;
        if (result.target === "project") {
          setDirty(false);
          setSaveState("saved");
          setSaveDetail("已自动保存");
        } else {
          setSaveState("recovery");
          setSaveDetail("已写入恢复快照，尚未保存为项目文件");
        }
      }).catch((error: unknown) => {
        setSaveState("error");
        setSaveDetail("自动保存失败");
        setProjectError(error instanceof Error ? error.message : String(error));
      });
    }, 900);
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

  const addComposerComponent = (componentId: ComposerComponentId): void => {
    const zIndex = Math.max(-1, ...project.composition.nodes.map((node) => node.transform.zIndex)) + 1;
    const node = createComposerNode(componentId, globalThis.crypto.randomUUID(), project.canvas.durationInFrames, zIndex);
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
    selectNodeOnly(node.id);
    commitComposition({...project.composition, nodes: project.composition.nodes.map((candidate) => candidate.id === node.id ? {...node, motion: {...node.motion, [phase]: presetId}} : candidate)});
    const previewFrame = phase === "exit"
      ? Math.max(node.timing.from, node.timing.from + node.timing.durationInFrames - node.motion.exitDuration - 1)
      : phase === "loop"
        ? node.timing.from + Math.floor(node.timing.durationInFrames / 2)
        : node.timing.from;
    playerRef.current?.seekTo(previewFrame);
  };

  const applyMotionPreset = (presetId: ComposerMotionPresetId, phase: "enter" | "exit" | "loop"): void => {
    if (selectedNodeId) applyMotionPresetToNode(selectedNodeId, presetId, phase);
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
    else player.play();
  }, []);

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

  useEffect(() => {
    if (project.editorMode !== "composer") return;
    const handleKeyDown = (event: KeyboardEvent): void => {
      if (event.code !== "Space" || event.repeat || event.altKey || event.ctrlKey || event.metaKey) return;
      const target = event.target as HTMLElement | null;
      // 文本输入元素内的空格仍用于输入；其余情况（含焦点在按钮/选择框上）统一拦截，
      // 避免空格触发按钮激活而变成“选择/取消选中”，始终作为播放/暂停。
      if (target?.closest("input, textarea, [contenteditable='true']")) return;
      event.preventDefault();
      togglePlayback();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [project.editorMode, togglePlayback]);

  const deleteSelectedNodesRef = useRef(deleteSelectedNodes);
  useEffect(() => {
    deleteSelectedNodesRef.current = deleteSelectedNodes;
  });
  useEffect(() => {
    if (project.editorMode !== "composer") return;
    const handleDeleteKey = (event: KeyboardEvent): void => {
      if (event.key !== "Delete" && event.key !== "Backspace") return;
      const target = event.target as HTMLElement | null;
      if (target?.closest("input, textarea, select, [contenteditable='true']")) return;
      if (!selectedNodeId) return;
      event.preventDefault();
      deleteSelectedNodesRef.current(false);
    };
    window.addEventListener("keydown", handleDeleteKey);
    return () => window.removeEventListener("keydown", handleDeleteKey);
  }, [project.editorMode, selectedNodeId]);

  useEffect(() => {
    if (project.editorMode !== "composer") return;
    // 点击与“选中节点操作”无关的区域（画布/时间线空白、工具栏、模板库、状态栏等）
    // 时清除选中，避免选中状态残留造成混乱。节点框、时间线行、时间线操作按钮
    // （删除/复制/置顶等，作用于当前选中）、组件库与检查器视为操作选中节点的
    // 上下文，保留选中——否则点击删除按钮会先被此处清空选中导致删除失效。
    const handleClick = (event: MouseEvent): void => {
      const target = event.target as HTMLElement | null;
      if (!target) return;
      if (target.closest(".composer-canvas-overlay, .composer-timeline .layer-timeline-row, .composer-timeline .timeline-toolbar, .component-library, .inspector-panel")) return;
      setSelectedNodeId(null);
      setMultiSelectedIds([]);
    };
    document.addEventListener("click", handleClick, true);
    return () => document.removeEventListener("click", handleClick, true);
  }, [project.editorMode]);

  const selectTemplate = (templateId: string): void => {
    if (templateId === project.template.id) return;
    const nextManifest = getTemplateManifest(templateId);
    markChanged({
      ...project,
      template: {id: nextManifest.id, version: nextManifest.version},
      props: {...nextManifest.defaultProps},
      assets: project.composition.nodes.length > 0 ? project.assets : project.assets.filter((asset) => asset.kind === "font"),
    });
    setRecentTemplates((current) => [templateId, ...current.filter((id) => id !== templateId)].slice(0, 8));
    playerRef.current?.seekTo(0);
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
        setDirty(session.path === null);
        setSaveState(session.path ? "saved" : "recovery");
        setSaveDetail(session.path ? "已恢复项目" : "已恢复未命名项目，请保存为文件");
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
          <div><div className="brand-name">Motioner</div><div className="brand-version">1.3 · {project.editorMode === "template" ? "快速制作" : "专业制作"}</div></div>
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
        <div className="project-identity" title={projectPath ?? "尚未保存为项目文件"}>
          <strong>{project.name}</strong><span className={`save-indicator save-${saveState}`} aria-hidden="true" /><span>{getProjectFileName(projectPath)}</span>
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
        <button type="button" className="export-button" title={renderError ?? selectedExportPreset.description} onClick={() => void startRender()} disabled={!canRender}>
          {activeJobCount > 0 ? `加入队列 · ${selectedExportPreset.shortLabel}` : segmentedExportEnabled ? `分段导出 · ${selectedExportPreset.shortLabel}` : `导出 · ${selectedExportPreset.shortLabel}`}
        </button>
      </header>

      <main id="motioner-workbench" className={`workbench workbench-${project.editorMode}`}>
        {project.editorMode === "template"
          ? <TemplateLibrary selected={manifest} favorites={favorites} recentTemplates={recentTemplates} onSelect={selectTemplate} onToggleFavorite={(templateId) => setFavorites((current) => current.includes(templateId) ? current.filter((id) => id !== templateId) : [...current, templateId])} />
          : <ComponentLibrary selectedNode={selectedNode} onAdd={addComposerComponent} onApplyMotion={applyMotionPreset} />}

        <section className={`canvas-panel ${project.editorMode === "composer" ? "composer-mode" : ""}`} aria-label="预览画布">
          <div className="canvas-toolbar">
            <div className="canvas-toolbar-copy"><h1>{project.editorMode === "composer" ? "自由编排画布" : "模板预览"}</h1><p>{project.editorMode === "composer" ? `${project.composition.nodes.length} 个图层 · 拖动定位，控制点缩放` : `${manifest.name} · ${manifest.description}`}</p></div>
            <div className="canvas-actions">
              {project.editorMode === "composer" && <button type="button" className={`transport-toggle ${isPlaying ? "active" : ""}`} onClick={togglePlayback} title="播放 / 暂停（空格）">{isPlaying ? <Pause /> : <Play />}{isPlaying ? "暂停" : "播放"}<kbd>Space</kbd></button>}
              <button type="button" className="icon-btn" onClick={() => playerRef.current?.seekTo(Math.max(0, currentFrame - 1))} title="上一帧" aria-label="上一帧"><ChevronLeft /></button>
              <button type="button" className="icon-btn" onClick={() => playerRef.current?.seekTo(Math.min(project.canvas.durationInFrames - 1, currentFrame + 1))} title="下一帧" aria-label="下一帧"><ChevronRight /></button>
              <button type="button" className="icon-btn" onClick={() => playerRef.current?.seekTo(0)} title="首帧" aria-label="首帧"><SkipBack /></button>
              <button type="button" className="icon-btn" onClick={() => playerRef.current?.seekTo(project.canvas.durationInFrames - 1)} title="末帧" aria-label="末帧"><SkipForward /></button>
              <button type="button" className={`icon-btn ${safeArea ? "active" : ""}`} onClick={() => setSafeArea((current) => !current)} title="切换安全区" aria-label="切换安全区"><Scan /></button>
              <select aria-label="预览背景" value={previewBackground} onChange={(event) => setPreviewBackground(event.target.value as PreviewBackground)}><option value="checker">棋盘格</option><option value="black">黑底</option><option value="white">白底</option><option value="gray">50% 灰</option><option value="image">剪辑截图</option></select>
              {previewBackground === "image" && <button type="button" className="icon-btn" onClick={() => void choosePreviewBackgroundImage()} title="选择剪辑截图" aria-label="选择剪辑截图"><Image /></button>}
              <button type="button" className={previewLowQuality ? "active" : ""} onClick={() => setPreviewLowQuality((current) => !current)} title="低配预览：以一半分辨率渲染预览，导出不受影响">低配预览</button>
              <select aria-label="预览缩放" value={previewZoom} onChange={(event) => setPreviewZoom(Number(event.target.value))}><option value={25}>25%</option><option value={50}>50%</option><option value={100}>100%</option></select>
              {project.editorMode === "composer" && <button type="button" className="icon-btn" onClick={() => addComposerComponent("template")} title="将当前模板加入画布"><LayoutTemplate />加入当前模板</button>}
              <span className="preview-status"><span className="status-dot" />同源预览</span>
            </div>
          </div>
          {project.editorMode === "composer" && composerScene.nodes.length === 0 && <div className="canvas-empty-hint"><strong>画布没有图层</strong><span>从左侧组件库添加文字、图形、数据或素材。</span></div>}
          <div className={`stage-wrap ${project.editorMode === "composer" ? "composer-stage-wrap" : ""}`}>
            <div className={`player-frame preview-background-${previewBackground}`} style={{
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
                inputProps={{mode: project.editorMode, templateId: manifest.id, templateProps: previewProps, composition: composerScene, assets: project.assets, motionSettings: project.animation, typography: project.typography}}
                controls={project.editorMode === "template"}
                loop
                clickToPlay={project.editorMode === "template"}
                style={{width: "100%", aspectRatio: `${project.canvas.width} / ${project.canvas.height}`}}
              />
              {project.editorMode === "composer" && <ComposerCanvasOverlay composition={composerScene} selectedNodeId={selectedNodeId} currentFrame={currentFrame} onSelect={selectNodeOnly} onPreview={setComposerPreview} onCommit={commitComposition} />}
              {safeArea && <div className="safe-area-overlay" aria-hidden="true"><span /></div>}
            </div>
          </div>
          {project.editorMode === "template" ? <div className="timeline-summary">
            <button type="button" className="icon-btn" onClick={() => playerRef.current?.seekTo(Math.max(0, currentFrame - 1))} title="上一帧" aria-label="上一帧"><SkipBack /></button>
            <span>{formatTimecode(currentFrame, project.canvas.fps)}</span>
            <div className={`timeline-track mode-${manifest.durationMode}`} aria-label={`${manifest.durationMode} 时长模式`}><span className="timeline-intro" /><span className="timeline-hold" /><span className="timeline-outro" /></div>
            <span>{formatTimecode(project.canvas.durationInFrames - 1, project.canvas.fps)}</span>
            <span>{currentFrame + 1} / {project.canvas.durationInFrames} 帧</span>
          </div> : <ComposerTimeline composition={composerScene} selectedNodeId={selectedNodeId} multiSelectedIds={multiSelectedIds} timeSlots={project.timeSlots} currentFrame={currentFrame} durationInFrames={project.canvas.durationInFrames} fps={project.canvas.fps} isPlaying={isPlaying} onTogglePlayback={togglePlayback} onSelect={selectNodeExtend} onPreview={setComposerPreview} onCommit={commitComposition} onValidate={(scene) => validateComposerComposition(scene, project.assets, project.canvas.durationInFrames) === null} onDelete={deleteSelectedNode} onDeleteRipple={deleteSelectedNodesRipple} onDuplicate={duplicateSelectedNode} onMoveLayer={moveSelectedLayer} onSeekStart={beginTimelineScrub} onSeek={seekTimelineFrame} onSeekEnd={endTimelineScrub} onApplyMotion={applyMotionPresetToNode} onAddTimeSlot={addTimeSlot} onUpdateTimeSlotFrame={updateTimeSlotFrame} onRemoveTimeSlot={removeTimeSlot} segments={project.segments} onAddSegment={addSegment} onUpdateSegmentFrame={updateSegmentFrame} onRemoveSegment={removeSegment} />}
        </section>

        <aside className="inspector-panel" aria-label="参数检查器">
          <div className="panel-heading inspector-title"><div><h2>{project.editorMode === "composer" ? selectedNode?.name ?? "图层属性" : "模板参数"}</h2><p>{project.editorMode === "composer" ? selectedNode ? `${getTemplateManifest(project.template.id).name} · ${selectedNode.componentId}` : "选择图层后编辑属性" : `${manifest.name} · ${manifest.durationMode} · v${manifest.version}`}</p></div><span className="alpha-badge">{project.editorMode === "composer" ? "图层" : "模板"}</span></div>
          {project.editorMode === "template"
            ? <Inspector manifest={manifest} props={project.props} assets={project.assets} onChange={updateProp} onPickMedia={pickMedia} />
            : <><ComposerInspector node={selectedNode} assets={project.assets} projectDurationInFrames={project.canvas.durationInFrames} onChange={updateSelectedNode} onPickMedia={pickComposerMedia} /><InspectorGroup title="场景" className="scene-editor"><label className="field"><span>背景</span><select value={project.composition.backgroundColor === "transparent" ? "transparent" : "solid"} onChange={(event) => commitComposition({...project.composition, backgroundColor: event.target.value === "transparent" ? "transparent" : "#0B0E12"})}><option value="transparent">透明</option><option value="solid">纯色</option></select></label>{project.composition.backgroundColor !== "transparent" && <label className="field"><span>背景颜色</span><div className="color-control"><input type="color" value={project.composition.backgroundColor} onChange={(event) => commitComposition({...project.composition, backgroundColor: event.target.value})} /><input value={project.composition.backgroundColor.toUpperCase()} onChange={(event) => commitComposition({...project.composition, backgroundColor: event.target.value})} /></div></label>}<label className="field inline-switch"><span>对齐网格</span><input className="switch-control" type="checkbox" checked={project.composition.snapToGrid} onChange={(event) => commitComposition({...project.composition, snapToGrid: event.target.checked})} /></label><label className="field"><span>网格间距</span><select value={project.composition.gridSize} onChange={(event) => commitComposition({...project.composition, gridSize: Number(event.target.value)})}><option value={0.01}>1%</option><option value={0.025}>2.5%</option><option value={0.05}>5%</option><option value={0.1}>10%</option></select></label></InspectorGroup></>}
          <InspectorGroup title="字体" className="typography-editor"><label className="field"><span>默认字体风格</span><select value={project.typography.fallbackFamily} onChange={(event) => markChanged({...project, typography: {...project.typography, fallbackFamily: event.target.value as MotionProject["typography"]["fallbackFamily"]}})}><option value="system">系统无衬线</option><option value="serif">宋体 / 衬线</option><option value="mono">等宽字体</option></select></label><div className="font-picker"><button type="button" onClick={() => void pickProjectFont()}>{selectedFont ? "替换字体" : "导入字体…"}</button><span title={selectedFont?.path}>{selectedFont?.path.split(/[\\/]/).at(-1) ?? "未导入项目字体"}</span>{selectedFont && <button type="button" className="icon-btn" onClick={() => markChanged({...project, typography: {...project.typography, fontAssetId: ""}})} title="恢复默认字体"><RotateCcw />恢复默认</button>}</div><small className="field-help">字体会作为项目素材保存指纹；请确认拥有相应使用授权。</small></InspectorGroup>
          <InspectorGroup title="全局动画" className="animation-editor"><label className="field"><span>速度</span><select value={project.animation.speed} onChange={(event) => updateAnimation({speed: Number(event.target.value)})}><option value={0.5}>0.5× 慢速</option><option value={0.75}>0.75×</option><option value={1}>1× 标准</option><option value={1.25}>1.25×</option><option value={1.5}>1.5×</option><option value={2}>2× 快速</option></select></label><label className="field"><span>入场 / 退场边缘帧</span><input type="number" min={6} max={90} value={project.animation.edgeFrames} onChange={(event) => updateAnimation({edgeFrames: Math.min(90, Math.max(6, event.target.valueAsNumber || 18))})} /></label><label className="field inline-switch"><span>减少动态（取消位移与数字滚动）</span><input className="switch-control" type="checkbox" checked={project.animation.reducedMotion} onChange={(event) => updateAnimation({reducedMotion: event.target.checked})} /></label></InspectorGroup>
          {project.editorMode === "template" ? <InspectorGroup title="工作流" className="preset-editor"><label className="field"><span>参数预设</span><select value="" onChange={(event) => applyParameterPreset(event.target.value)}><option value="">选择已保存预设…</option>{parameterPresets.filter((preset) => preset.templateId === manifest.id).map((preset) => <option key={preset.id} value={preset.id}>{preset.name}</option>)}</select></label><div className="workflow-actions"><button type="button" onClick={saveParameterPreset}>保存当前参数</button><button type="button" onClick={() => void exportParameterPresets()} disabled={parameterPresets.length === 0}>导出预设</button><button type="button" onClick={() => void importParameterPresets()}>导入预设</button><button type="button" onClick={() => void collectProjectAssets()} disabled={project.assets.length === 0}>收集素材</button><button type="button" onClick={() => void relinkProjectAssets("files")} disabled={project.assets.length === 0}>重链文件</button><button type="button" onClick={() => void relinkProjectAssets("folder")} disabled={project.assets.length === 0}>扫描文件夹</button><button type="button" onClick={() => batchCsvRef.current?.click()}>CSV 批量生成</button><input ref={batchCsvRef} className="sr-only" type="file" accept=".csv,text/csv" onChange={(event) => {const file = event.target.files?.[0]; if (file) void importBatchCsv(file);}} /></div><small className="field-help">CSV 会先预览列映射与文件名，一次最多 100 行。</small></InspectorGroup> : <InspectorGroup title="项目素材" className="preset-editor"><div className="workflow-actions"><button type="button" onClick={() => void collectProjectAssets()} disabled={project.assets.length === 0}>收集素材</button><button type="button" onClick={() => void relinkProjectAssets("files")} disabled={project.assets.length === 0}>重链文件</button><button type="button" onClick={() => void relinkProjectAssets("folder")} disabled={project.assets.length === 0}>扫描文件夹</button></div><small className="field-help">图片、视频与字体都保存在项目素材清单中，可集中收集或重新链接。</small></InspectorGroup>}
          {project.editorMode === "template" && batchDraft && <InspectorGroup title="批量生成" defaultOpen><BatchImportPanel draft={batchDraft} project={project} manifest={manifest} onChange={setBatchDraft} onClose={() => setBatchDraft(null)} onStart={startBatchProjects} /></InspectorGroup>}
          <InspectorGroup title="输出规格" className="output-editor">
            <label className="field"><span>画布预设</span><select value={CANVAS_PRESETS.find((preset) => preset.width === project.canvas.width && preset.height === project.canvas.height)?.id ?? "custom"} onChange={(event) => {
              const preset = CANVAS_PRESETS.find((candidate) => candidate.id === event.target.value);
              if (preset) updateCanvas({width: preset.width, height: preset.height});
            }}><option value="custom">自定义</option>{CANVAS_PRESETS.map((preset) => <option key={preset.id} value={preset.id}>{preset.label}</option>)}</select></label>
            <DimensionInput width={project.canvas.width} height={project.canvas.height} onCommit={(w, h) => updateCanvas({width: w, height: h})} />
            <label className="field"><span>帧率</span><select value={frameRateKey(project.canvas.fps)} onChange={(event) => changeFrameRate(event.target.value)}>{FRAME_RATE_PRESETS.map((preset) => <option key={frameRateKey(preset.value)} value={frameRateKey(preset.value)}>{preset.label} fps</option>)}</select></label>
            <DurationInput seconds={durationSeconds} frames={project.canvas.durationInFrames} onCommit={(seconds) => updateCanvas({durationInFrames: secondsToFrames(seconds, project.canvas.fps)})} />
            <label className="field"><span>导出格式</span><select value={project.exportPresetId} onChange={(event) => markChanged({...project, exportPresetId: getExportPreset(event.target.value).id})}>{EXPORT_PRESETS.map((preset) => <option key={preset.id} value={preset.id}>{preset.label}</option>)}</select><small className="field-help">{selectedExportPreset.description}</small></label>
            <label className="field inline-switch"><span>分段导出</span><input className="switch-control" type="checkbox" checked={project.exportOptions.segmented} disabled={!segmentedExportAvailable} onChange={(event) => markChanged({...project, exportOptions: {...project.exportOptions, segmented: event.target.checked}})} /><small className="field-help">{selectedExportPreset.kind !== "video" ? "仅视频格式支持多文件分段导出" : project.segments.length === 0 ? "先在时间线播放头位置添加分段点" : `将输出 ${project.segments.length + 1} 个视频和 sections.json`}</small></label>
            <label className="field"><span>目标重名时</span><select value={project.exportOptions.conflictPolicy} onChange={(event) => markChanged({...project, exportOptions: {...project.exportOptions, conflictPolicy: event.target.value as MotionProject["exportOptions"]["conflictPolicy"]}})}><option value="version">自动追加版本号</option><option value="replace">验证成功后替换</option><option value="skip">跳过，不生成</option></select></label>
            <dl className="output-summary"><div><dt>色彩空间</dt><dd>Rec.709 SDR</dd></div><div><dt>透明通道</dt><dd>{selectedExportPreset.alpha ? "保留" : "不包含（深色审看底）"}</dd></div><div><dt>输出</dt><dd>{segmentedExportEnabled ? `${project.segments.length + 1} 个分段文件` : "1 个完整文件"}</dd></div><div><dt>预计空间</dt><dd>约 {formatBytes(estimateExportBytes(project, selectedExportPreset.id))}</dd></div></dl>
          </InspectorGroup>
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
    </div>
  );
};
