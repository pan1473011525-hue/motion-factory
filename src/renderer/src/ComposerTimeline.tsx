import {useMemo, useRef, useState} from "react";
import {
  ArrowDown,
  ArrowDownToLine,
  ArrowUp,
  ArrowUpToLine,
  Copy,
  ChevronLeft,
  ChevronRight,
  Diamond,
  Eye,
  EyeOff,
  Flag,
  Lock,
  LockOpen,
  ListRestart,
  Pause,
  Play,
  Scissors,
  SkipBack,
  SkipForward,
  Trash2,
} from "lucide-react";
import type {
  ComposerComposition,
  ComposerMotionPresetId,
  ComposerNode,
  FrameRate,
} from "../../../packages/project-model/src";
import {formatTimecode} from "../../../packages/project-model/src";
import {motionPresets} from "../../composer/registry";
import {
  chooseMotionDropPhase,
  frameFromTimelinePointer,
  motionDurationFromBoundaryFrame,
  snapFrame,
  type MotionBoundary,
  type MotionDropPhase,
} from "./timeline-interaction";
import type {Segment, TimeSlot} from "../../../packages/project-model/src";

type TimingPointer = {
  kind: "timing";
  pointerId: number;
  mode: "move" | "trim-start" | "trim-end";
  node: ComposerNode;
  scene: ComposerComposition;
  startClientX: number;
  trackWidth: number;
  lastScene: ComposerComposition | null;
};

type ScrubPointer = {
  kind: "scrub";
  pointerId: number;
  trackLeft: number;
  trackWidth: number;
  nodeId?: string;
};

type SlotPointer = {
  kind: "slot";
  pointerId: number;
  slotId: string;
  trackLeft: number;
  trackWidth: number;
};

type SegmentPointer = {
  kind: "segment";
  pointerId: number;
  segmentId: string;
  trackLeft: number;
  trackWidth: number;
};

type MotionBoundaryPointer = {
  kind: "motion-boundary";
  pointerId: number;
  boundary: MotionBoundary;
  node: ComposerNode;
  scene: ComposerComposition;
  trackLeft: number;
  trackWidth: number;
  lastScene: ComposerComposition | null;
};

type TimelinePointer = TimingPointer | ScrubPointer | SlotPointer | SegmentPointer | MotionBoundaryPointer;

type MotionDropState = {
  nodeId: string;
  phase: MotionDropPhase;
};

const replaceNode = (scene: ComposerComposition, node: ComposerNode): ComposerComposition => ({
  ...scene,
  nodes: scene.nodes.map((candidate) => candidate.id === node.id ? node : candidate),
});
const clamp = (value: number, minimum: number, maximum: number): number =>
  Math.min(maximum, Math.max(minimum, value));

const readDraggedMotion = (event: React.DragEvent): ComposerMotionPresetId | null => {
  const value = event.dataTransfer.getData("application/x-motioner-motion-preset") || event.dataTransfer.getData("text/plain");
  return motionPresets.some((preset) => preset.id === value) ? value as ComposerMotionPresetId : null;
};

const isMotionDrag = (event: React.DragEvent): boolean =>
  Array.from(event.dataTransfer.types).includes("application/x-motioner-motion-preset");

const motionName = (id: ComposerMotionPresetId): string =>
  motionPresets.find((preset) => preset.id === id)?.name ?? id;

export const ComposerTimeline: React.FC<{
  composition: ComposerComposition;
  selectedNodeId: string | null;
  multiSelectedIds?: ReadonlyArray<string>;
  timeSlots?: ReadonlyArray<TimeSlot>;
  segments?: ReadonlyArray<Segment>;
  currentFrame: number;
  durationInFrames: number;
  fps: FrameRate;
  isPlaying: boolean;
  onTogglePlayback: () => void;
  onSelect: (nodeId: string, extend: boolean) => void;
  onPreview: (composition: ComposerComposition | null) => void;
  onCommit: (composition: ComposerComposition) => void;
  onValidate?: (composition: ComposerComposition) => boolean;
  onDelete: () => void;
  onDeleteRipple?: () => void;
  onDuplicate: () => void;
  onMoveLayer: (direction: "front" | "back" | "up" | "down") => void;
  onSeekStart: () => void;
  onSeek: (frame: number) => void;
  onSeekEnd: () => void;
  onApplyMotion: (nodeId: string, presetId: ComposerMotionPresetId, phase: MotionDropPhase) => void;
  onAddTimeSlot?: () => void;
  onUpdateTimeSlotFrame?: (slotId: string, frame: number) => void;
  onRemoveTimeSlot?: (slotId: string) => void;
  onAddSegment?: () => void;
  onUpdateSegmentFrame?: (segmentId: string, frame: number) => void;
  onRemoveSegment?: (segmentId: string) => void;
}> = ({composition, selectedNodeId, multiSelectedIds = [], timeSlots = [], segments = [], currentFrame, durationInFrames, fps, isPlaying, onTogglePlayback, onSelect, onPreview, onCommit, onValidate, onDelete, onDeleteRipple, onDuplicate, onMoveLayer, onSeekStart, onSeek, onSeekEnd, onApplyMotion, onAddTimeSlot, onUpdateTimeSlotFrame, onRemoveTimeSlot, onAddSegment, onUpdateSegmentFrame, onRemoveSegment}) => {
  const rootRef = useRef<HTMLElement>(null);
  const pointerRef = useRef<TimelinePointer | null>(null);
  const [motionDrop, setMotionDrop] = useState<MotionDropState | null>(null);

  // 吸附点:画布首末帧、播放头、所有图层起点与终点。拖动时按住 Alt 临时禁用。
  const snapTargets = useMemo(() => {
    const targets = new Set<number>([0, Math.max(0, durationInFrames - 1), currentFrame]);
    for (const node of composition.nodes) {
      targets.add(node.timing.from);
      targets.add(node.timing.from + node.timing.durationInFrames);
    }
    return [...targets];
  }, [composition.nodes, durationInFrames, currentFrame]);
  const snap = (frame: number, disabled: boolean): number =>
    disabled ? frame : snapFrame(frame, snapTargets).frame;

  const selectTimelineTarget = (target: EventTarget | null, extend: boolean): void => {
    const element = target instanceof Element ? target.closest<HTMLElement>("[data-timeline-node-id]") : null;
    const nodeId = element?.dataset.timelineNodeId;
    if (nodeId) onSelect(nodeId, extend);
  };

  const capturePointer = (pointerId: number): void => {
    try {
      rootRef.current?.setPointerCapture(pointerId);
    } catch {
      // The pointer may have ended before Chromium grants capture.
    }
  };

  const beginScrub = (event: React.PointerEvent<HTMLElement>, node?: ComposerNode): void => {
    if (event.button !== 0) return;
    event.preventDefault();
    event.stopPropagation();
    if (node) onSelect(node.id, event.shiftKey);
    const bounds = event.currentTarget.getBoundingClientRect();
    capturePointer(event.pointerId);
    pointerRef.current = {kind: "scrub", pointerId: event.pointerId, trackLeft: bounds.left, trackWidth: bounds.width, nodeId: node?.id};
    onSeekStart();
    onSeek(snap(frameFromTimelinePointer(event.clientX, bounds.left, bounds.width, durationInFrames), event.altKey));
  };

  const beginTiming = (event: React.PointerEvent, node: ComposerNode, mode: TimingPointer["mode"]): void => {
    if (event.button !== 0) return;
    event.preventDefault();
    event.stopPropagation();
    onSelect(node.id, false);
    if (node.locked) return;
    const track = event.currentTarget.closest(".layer-timing-track")?.getBoundingClientRect();
    if (!track) return;
    capturePointer(event.pointerId);
    pointerRef.current = {kind: "timing", pointerId: event.pointerId, mode, node: structuredClone(node), scene: structuredClone(composition), startClientX: event.clientX, trackWidth: track.width, lastScene: null};
    onSeekStart();
    const previewFrame = mode === "trim-end"
      ? node.timing.from + node.timing.durationInFrames - 1
      : mode === "trim-start"
        ? node.timing.from
        : snap(frameFromTimelinePointer(event.clientX, track.left, track.width, durationInFrames), event.altKey);
    onSeek(previewFrame);
  };

  const beginSlotDrag = (event: React.PointerEvent, slotId: string): void => {
    event.preventDefault();
    event.stopPropagation();
    const track = event.currentTarget.closest(".timeline-ruler")?.getBoundingClientRect();
    if (!track) return;
    capturePointer(event.pointerId);
    pointerRef.current = {kind: "slot", pointerId: event.pointerId, slotId, trackLeft: track.left, trackWidth: track.width};
  };

  const beginSegmentDrag = (event: React.PointerEvent, segmentId: string): void => {
    if (event.button !== 0) return;
    event.preventDefault();
    event.stopPropagation();
    const track = event.currentTarget.closest(".timeline-ruler")?.getBoundingClientRect();
    if (!track) return;
    capturePointer(event.pointerId);
    pointerRef.current = {kind: "segment", pointerId: event.pointerId, segmentId, trackLeft: track.left, trackWidth: track.width};
  };

  const beginMotionBoundary = (event: React.PointerEvent, node: ComposerNode, boundary: MotionBoundary): void => {
    if (event.button !== 0 || node.locked) return;
    event.preventDefault();
    event.stopPropagation();
    const track = event.currentTarget.closest(".layer-timing-track")?.getBoundingClientRect();
    if (!track) return;
    onSelect(node.id, false);
    capturePointer(event.pointerId);
    pointerRef.current = {kind: "motion-boundary", pointerId: event.pointerId, boundary, node: structuredClone(node), scene: structuredClone(composition), trackLeft: track.left, trackWidth: track.width, lastScene: null};
    onSeekStart();
  };

  const handlePointerMove = (event: React.PointerEvent<HTMLElement>): void => {
    const session = pointerRef.current;
    if (!session || session.pointerId !== event.pointerId) return;
    if (session.kind === "segment") {
      if (onUpdateSegmentFrame) {
        const frame = snap(frameFromTimelinePointer(event.clientX, session.trackLeft, session.trackWidth, durationInFrames), event.altKey);
        onUpdateSegmentFrame(session.segmentId, clamp(frame, 1, Math.max(1, durationInFrames - 1)));
      }
      return;
    }
    if (session.kind === "slot") {
      if (onUpdateTimeSlotFrame) {
        onUpdateTimeSlotFrame(session.slotId, snap(frameFromTimelinePointer(event.clientX, session.trackLeft, session.trackWidth, durationInFrames), event.altKey));
      }
      return;
    }
    if (session.kind === "scrub") {
      onSeek(snap(frameFromTimelinePointer(event.clientX, session.trackLeft, session.trackWidth, durationInFrames), event.altKey));
      return;
    }
    if (session.kind === "motion-boundary") {
      const frame = snap(frameFromTimelinePointer(event.clientX, session.trackLeft, session.trackWidth, durationInFrames), event.altKey);
      const motionDuration = motionDurationFromBoundaryFrame(session.boundary, frame, session.node.timing.from, session.node.timing.durationInFrames);
      const nextNode = {
        ...session.node,
        motion: {
          ...session.node.motion,
          [session.boundary === "enter-end" ? "enterDuration" : "exitDuration"]: motionDuration,
        },
      };
      const nextScene = replaceNode(session.scene, nextNode);
      session.lastScene = nextScene;
      onPreview(nextScene);
      onSeek(session.boundary === "enter-end"
        ? session.node.timing.from + motionDuration
        : session.node.timing.from + session.node.timing.durationInFrames - motionDuration);
      return;
    }
    if (session.trackWidth <= 0) return;
    const deltaFrames = Math.round((event.clientX - session.startClientX) / session.trackWidth * durationInFrames);
    const origin = session.node.timing;
    let from = origin.from;
    let duration = origin.durationInFrames;
    if (session.mode === "move") from = snap(clamp(origin.from + deltaFrames, 0, Math.max(0, durationInFrames - duration)), event.altKey);
    if (session.mode === "trim-start") {
      from = snap(clamp(origin.from + deltaFrames, 0, origin.from + origin.durationInFrames - 1), event.altKey);
      duration = origin.durationInFrames + origin.from - from;
    }
    if (session.mode === "trim-end") duration = clamp(origin.durationInFrames + deltaFrames, 1, durationInFrames - origin.from);
    const nextScene = replaceNode(session.scene, {...session.node, timing: {from, durationInFrames: duration}});
    session.lastScene = nextScene;
    onPreview(nextScene);
    onSeek(session.mode === "trim-end" ? from + duration - 1 : from);
  };

  const endPointer = (event: React.PointerEvent<HTMLElement>): void => {
    const session = pointerRef.current;
    if (!session || event.pointerId !== session.pointerId) return;
    if (rootRef.current?.hasPointerCapture(event.pointerId)) rootRef.current.releasePointerCapture(event.pointerId);
    pointerRef.current = null;
    onSeekEnd();
    if (session.kind === "scrub" && session.nodeId) onSelect(session.nodeId, false);
    if (session.kind === "timing" || session.kind === "motion-boundary") onSelect(session.node.id, false);
    if (session.kind === "timing" || session.kind === "motion-boundary") {
      onPreview(null);
      // 干跑校验:编辑结果不合法(如校验失败)则丢弃,不落盘。
      if (session.lastScene && (!onValidate || onValidate(session.lastScene))) {
        onCommit(session.lastScene);
      }
    }
  };

  const getDrop = (event: React.DragEvent): {presetId: ComposerMotionPresetId; phase: MotionDropPhase} | null => {
    const presetId = readDraggedMotion(event);
    const preset = motionPresets.find((candidate) => candidate.id === presetId);
    if (!presetId || !preset) return null;
    const bounds = event.currentTarget.getBoundingClientRect();
    const progress = bounds.width <= 0 ? 0 : (event.clientX - bounds.left) / bounds.width;
    const phase = chooseMotionDropPhase(progress, preset.phases);
    return phase ? {presetId, phase} : null;
  };

  const ordered = [...composition.nodes].sort((a, b) => b.transform.zIndex - a.transform.zIndex);
  const playheadPercent = currentFrame / Math.max(1, durationInFrames - 1) * 100;
  return <section
    ref={rootRef}
    className="composer-timeline"
    aria-label="图层时间轴"
    onPointerDownCapture={(event) => {if (event.button === 0) selectTimelineTarget(event.target, event.shiftKey);}}
    onClickCapture={(event) => selectTimelineTarget(event.target, event.shiftKey)}
    onPointerMove={handlePointerMove}
    onPointerUp={endPointer}
    onPointerCancel={endPointer}
  >
    <header className="timeline-toolbar">
      <div className="timeline-transport">
        <button type="button" className="icon-btn" onClick={() => onSeek(0)} title="前往首帧（⌘←）" aria-label="前往首帧"><SkipBack /></button>
        <button type="button" className="icon-btn" onClick={() => onSeek(Math.max(0, currentFrame - 1))} title="上一帧（←）" aria-label="上一帧"><ChevronLeft /></button>
        <button type="button" className={`timeline-play-toggle icon-btn ${isPlaying ? "active" : ""}`} onClick={onTogglePlayback} title="播放 / 暂停（空格）" aria-label={isPlaying ? "暂停，快捷键空格" : "播放，快捷键空格"}>{isPlaying ? <Pause /> : <Play />}</button>
        <button type="button" className="icon-btn" onClick={() => onSeek(Math.min(durationInFrames - 1, currentFrame + 1))} title="下一帧（→）" aria-label="下一帧"><ChevronRight /></button>
        <button type="button" className="icon-btn" onClick={() => onSeek(durationInFrames - 1)} title="前往末帧（⌘→）" aria-label="前往末帧"><SkipForward /></button>
      </div>
      <div className="timeline-status" aria-label="时间线状态">
        <span>{composition.nodes.length} 层</span>
        <span className="timeline-keyframe-legend" title="拖动素材条上的菱形，调整已有入场或退场时长"><Diamond />关键点</span>
      </div>
      <div className="timeline-edit-actions">
        {onAddTimeSlot && <button type="button" className="icon-btn" onClick={onAddTimeSlot} title="在当前播放头添加时间标记（M）" aria-label="添加时间标记"><Flag /></button>}
        {onAddSegment && <button type="button" className="icon-btn" onClick={onAddSegment} title="在当前播放头添加导出分段点（Shift+M）" aria-label="添加导出分段点"><Scissors /></button>}
      </div>
      <div className="timeline-layer-actions">
        <button type="button" className="icon-btn" disabled={!selectedNodeId} onClick={onDuplicate} title="复制选中图层" aria-label="复制选中图层"><Copy /></button>
        <button type="button" className="icon-btn" disabled={!selectedNodeId} onClick={() => onMoveLayer("front")} title="置顶" aria-label="置顶"><ArrowUpToLine /></button>
        <button type="button" className="icon-btn" disabled={!selectedNodeId} onClick={() => onMoveLayer("up")} title="上移" aria-label="上移"><ArrowUp /></button>
        <button type="button" className="icon-btn" disabled={!selectedNodeId} onClick={() => onMoveLayer("down")} title="下移" aria-label="下移"><ArrowDown /></button>
        <button type="button" className="icon-btn" disabled={!selectedNodeId} onClick={() => onMoveLayer("back")} title="置底" aria-label="置底"><ArrowDownToLine /></button>
      </div>
      <div className="timeline-delete-actions">
        {onDeleteRipple && <button type="button" className="icon-btn" disabled={!selectedNodeId} onClick={onDeleteRipple} title="波纹删除（Shift+Delete）" aria-label="波纹删除"><ListRestart /></button>}
        <button type="button" className="icon-btn timeline-delete" disabled={!selectedNodeId} onClick={onDelete} title={selectedNodeId ? "删除选中图层（Delete）" : "先选择图层再删除"} aria-label="删除选中图层"><Trash2 /></button>
      </div>
      <div className="timeline-readout"><span>{formatTimecode(currentFrame, fps)}</span><span>/</span><span>{formatTimecode(durationInFrames - 1, fps)}</span></div>
    </header>
    <div
      className="timeline-ruler"
      role="slider"
      tabIndex={0}
      aria-label="预览时间轴，点击或拖动寻帧"
      aria-valuemin={0}
      aria-valuemax={durationInFrames - 1}
      aria-valuenow={currentFrame}
      aria-valuetext={formatTimecode(currentFrame, fps)}
      onPointerDown={beginScrub}
      onKeyDown={(event) => {
        if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) return;
        event.preventDefault();
        const next = event.key === "Home" ? 0 : event.key === "End" ? durationInFrames - 1 : currentFrame + (event.key === "ArrowLeft" ? -1 : 1) * (event.shiftKey ? 10 : 1);
        onSeek(clamp(next, 0, durationInFrames - 1));
      }}
    >
      <span style={{left: 0}}>0</span><span style={{left: "25%"}}>25%</span><span style={{left: "50%"}}>50%</span><span style={{left: "75%"}}>75%</span><span style={{right: 0}}>100%</span><i style={{left: `${playheadPercent}%`}} />
      {timeSlots.map((slot) => {
        const left = slot.frame / Math.max(1, durationInFrames - 1) * 100;
        return <button key={slot.id} type="button" className="timeline-time-slot" style={{left: `${left}%`}} title={`${slot.label} · ${slot.frame} 帧（拖动调整，Alt 临时取消吸附）`} onPointerDown={(event) => beginSlotDrag(event, slot.id)}>
          <span>{slot.label}</span>
          {onRemoveTimeSlot && <b aria-label={`删除标记 ${slot.label}`} onPointerDown={(event) => {event.stopPropagation(); event.preventDefault();}} onClick={(event) => {event.stopPropagation(); onRemoveTimeSlot(slot.id);}}>×</b>}
        </button>;
      })}
      {segments.map((segment) => {
        const left = segment.frame / Math.max(1, durationInFrames - 1) * 100;
        return <span key={segment.id} className="timeline-segment-marker" style={{left: `${left}%`}} title={`${segment.label} · ${segment.frame} 帧（拖动调整，Alt 临时取消吸附）`} onPointerDown={(event) => beginSegmentDrag(event, segment.id)}>
          <b>{segment.label}</b>
          {onRemoveSegment && <i aria-label={`删除分段点 ${segment.label}`} onPointerDown={(event) => {event.stopPropagation(); event.preventDefault();}} onClick={(event) => {event.stopPropagation(); onRemoveSegment(segment.id);}}>×</i>}
        </span>;
      })}
    </div>
    <div className="layer-timeline-rows">
      {ordered.length === 0 && <div className="timeline-empty"><strong>画布还没有图层</strong><span>从左侧组件库添加文字、图形、数据或素材。</span></div>}
      {ordered.map((node) => {
        const dropTarget = motionDrop?.nodeId === node.id ? motionDrop : null;
        const motionSummary = [node.motion.enter !== "none" ? `入场：${motionName(node.motion.enter)}` : null, node.motion.loop !== "none" ? `循环：${motionName(node.motion.loop)}` : null, node.motion.exit !== "none" ? `退场：${motionName(node.motion.exit)}` : null].filter(Boolean).join(" · ");
        return <div key={node.id} className={`layer-timeline-row ${node.id === selectedNodeId ? "selected" : ""} ${multiSelectedIds.includes(node.id) ? "multi-selected" : ""}`} onClick={(event) => onSelect(node.id, event.shiftKey)}>
          <div className="layer-controls">
            <button type="button" className="icon-btn" title={node.hidden ? "显示图层" : "隐藏图层"} aria-label={node.hidden ? "显示图层" : "隐藏图层"} onClick={(event) => {event.stopPropagation(); onCommit(replaceNode(composition, {...node, hidden: !node.hidden}));}}>{node.hidden ? <EyeOff /> : <Eye />}</button>
            <button type="button" className="icon-btn" title={node.locked ? "解锁图层" : "锁定图层"} aria-label={node.locked ? "解锁图层" : "锁定图层"} onClick={(event) => {event.stopPropagation(); onCommit(replaceNode(composition, {...node, locked: !node.locked}));}}>{node.locked ? <Lock /> : <LockOpen />}</button>
            <span title={motionSummary || node.name}>{node.name}</span>
          </div>
          <div className="layer-timing-track" data-timeline-node-id={node.id} onPointerDown={(event) => beginScrub(event, node)}>
            <span className="timeline-playhead" style={{left: `${playheadPercent}%`}} />
            <button
              type="button"
              className={`layer-timing-bar ${node.hidden ? "hidden" : ""} ${dropTarget ? "motion-drop-active" : ""}`}
              aria-label={`选择图层 ${node.name}`}
              data-selected={node.id === selectedNodeId ? "true" : undefined}
              style={{left: `${node.timing.from / durationInFrames * 100}%`, width: `${node.timing.durationInFrames / durationInFrames * 100}%`}}
              title={motionSummary ? `${node.name} · ${motionSummary}` : `${node.name} · 可拖入动效`}
              onPointerDown={(event) => beginTiming(event, node, "move")}
              onClick={(event) => {event.stopPropagation(); onSelect(node.id, event.shiftKey);}}
              onKeyDown={(event) => {
                if (event.key !== "Enter" && event.key !== " ") return;
                event.preventDefault();
                onSelect(node.id, event.shiftKey);
              }}
              onDragOver={(event) => {
                if (!isMotionDrag(event)) return;
                event.preventDefault();
                event.stopPropagation();
                event.dataTransfer.dropEffect = "copy";
                const drop = getDrop(event);
                if (drop) setMotionDrop({nodeId: node.id, phase: drop.phase});
                else {
                  const bounds = event.currentTarget.getBoundingClientRect();
                  const phase = chooseMotionDropPhase((event.clientX - bounds.left) / Math.max(1, bounds.width), ["enter", "loop", "exit"]);
                  if (phase) setMotionDrop({nodeId: node.id, phase});
                }
              }}
              onDragLeave={(event) => {
                if (event.currentTarget.contains(event.relatedTarget as Node | null)) return;
                setMotionDrop((current) => current?.nodeId === node.id ? null : current);
              }}
              onDrop={(event) => {
                const drop = getDrop(event);
                event.preventDefault();
                event.stopPropagation();
                setMotionDrop(null);
                if (!drop) return;
                onSelect(node.id, false);
                onApplyMotion(node.id, drop.presetId, drop.phase);
              }}
            >
              <i className="timing-handle timing-start" onPointerDown={(event) => beginTiming(event, node, "trim-start")} />
              <span className="timing-duration">{node.timing.durationInFrames}f</span>
              {motionSummary && <span className="timeline-motion-summary" aria-hidden="true">FX</span>}
              {node.motion.enter !== "none" && <span role="button" className="motion-keyframe motion-keyframe-enter" style={{left: `${clamp(node.motion.enterDuration / Math.max(1, node.timing.durationInFrames) * 100, 0, 100)}%`}} title={`入场结束 · ${node.motion.enterDuration} 帧（拖动调整）`} aria-label={`调整 ${node.name} 入场时长，当前 ${node.motion.enterDuration} 帧`} onPointerDown={(event) => beginMotionBoundary(event, node, "enter-end")} />}
              {node.motion.exit !== "none" && <span role="button" className="motion-keyframe motion-keyframe-exit" style={{left: `${clamp((node.timing.durationInFrames - node.motion.exitDuration) / Math.max(1, node.timing.durationInFrames) * 100, 0, 100)}%`}} title={`退场开始 · ${node.motion.exitDuration} 帧（拖动调整）`} aria-label={`调整 ${node.name} 退场时长，当前 ${node.motion.exitDuration} 帧`} onPointerDown={(event) => beginMotionBoundary(event, node, "exit-start")} />}
              {dropTarget && <span className="motion-drop-zones" aria-hidden="true"><b className={dropTarget.phase === "enter" ? "active" : ""}>入场</b><b className={dropTarget.phase === "loop" ? "active" : ""}>循环</b><b className={dropTarget.phase === "exit" ? "active" : ""}>退场</b></span>}
              <i className="timing-handle timing-end" onPointerDown={(event) => beginTiming(event, node, "trim-end")} />
            </button>
          </div>
        </div>;
      })}
    </div>
  </section>;
};
