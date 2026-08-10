import {useMemo, useRef, useState} from "react";
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
  snapFrame,
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
};

type SlotPointer = {
  kind: "slot";
  pointerId: number;
  slotId: string;
  trackLeft: number;
  trackWidth: number;
};

type TimelinePointer = TimingPointer | ScrubPointer | SlotPointer;

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
  onRemoveSegment?: (segmentId: string) => void;
}> = ({composition, selectedNodeId, multiSelectedIds = [], timeSlots = [], segments = [], currentFrame, durationInFrames, fps, isPlaying, onTogglePlayback, onSelect, onPreview, onCommit, onValidate, onDelete, onDeleteRipple, onDuplicate, onMoveLayer, onSeekStart, onSeek, onSeekEnd, onApplyMotion, onAddTimeSlot, onUpdateTimeSlotFrame, onRemoveTimeSlot, onAddSegment, onRemoveSegment}) => {
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

  const capturePointer = (pointerId: number): void => {
    try {
      rootRef.current?.setPointerCapture(pointerId);
    } catch {
      // The pointer may have ended before Chromium grants capture.
    }
  };

  const beginScrub = (event: React.PointerEvent<HTMLElement>): void => {
    if (event.button !== 0) return;
    event.preventDefault();
    event.stopPropagation();
    const bounds = event.currentTarget.getBoundingClientRect();
    capturePointer(event.pointerId);
    pointerRef.current = {kind: "scrub", pointerId: event.pointerId, trackLeft: bounds.left, trackWidth: bounds.width};
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

  const handlePointerMove = (event: React.PointerEvent<HTMLElement>): void => {
    const session = pointerRef.current;
    if (!session || session.pointerId !== event.pointerId) return;
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
    if (session.kind === "timing") {
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
    onPointerMove={handlePointerMove}
    onPointerUp={endPointer}
    onPointerCancel={endPointer}
  >
    <header className="timeline-toolbar">
      <div className="timeline-transport">
        <button type="button" className={`timeline-play-toggle ${isPlaying ? "active" : ""}`} onClick={onTogglePlayback} title="播放 / 暂停（空格）" aria-label={isPlaying ? "暂停，快捷键空格" : "播放，快捷键空格"}><span aria-hidden="true">{isPlaying ? "Ⅱ" : "▶"}</span>{isPlaying ? "暂停" : "播放"}</button>
        <span>{composition.nodes.length} 层</span>
        {onAddTimeSlot && <button type="button" onClick={onAddTimeSlot} title="在当前播放头添加时间标记">＋标记</button>}
        {onAddSegment && <button type="button" onClick={onAddSegment} title="在当前播放头添加分段点">＋分段</button>}
      </div>
      <div className="timeline-layer-actions">
        <button type="button" disabled={!selectedNodeId} onClick={onDuplicate}>复制</button>
        <button type="button" disabled={!selectedNodeId} onClick={() => onMoveLayer("front")}>置顶</button>
        <button type="button" disabled={!selectedNodeId} onClick={() => onMoveLayer("up")}>上移</button>
        <button type="button" disabled={!selectedNodeId} onClick={() => onMoveLayer("down")}>下移</button>
        <button type="button" disabled={!selectedNodeId} onClick={() => onMoveLayer("back")}>置底</button>
        {onDeleteRipple && <button type="button" disabled={!selectedNodeId} onClick={onDeleteRipple} title="删除并左移其后图层">波纹删除</button>}
        <button type="button" className="timeline-delete" disabled={!selectedNodeId} onClick={onDelete}>删除</button>
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
        return <span key={segment.id} className="timeline-segment-marker" style={{left: `${left}%`}} title={`${segment.label} · ${segment.frame} 帧`}>
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
            <button type="button" title={node.hidden ? "显示图层" : "隐藏图层"} onClick={(event) => {event.stopPropagation(); onCommit(replaceNode(composition, {...node, hidden: !node.hidden}));}}>{node.hidden ? "隐" : "显"}</button>
            <button type="button" title={node.locked ? "解锁图层" : "锁定图层"} onClick={(event) => {event.stopPropagation(); onCommit(replaceNode(composition, {...node, locked: !node.locked}));}}>{node.locked ? "锁" : "开"}</button>
            <span title={motionSummary || node.name}>{node.name}</span>
          </div>
          <div className="layer-timing-track" onPointerDown={(event) => {onSelect(node.id, false); beginScrub(event);}}>
            <span className="timeline-playhead" style={{left: `${playheadPercent}%`}} />
            <button
              type="button"
              className={`layer-timing-bar ${node.hidden ? "hidden" : ""} ${dropTarget ? "motion-drop-active" : ""}`}
              style={{left: `${node.timing.from / durationInFrames * 100}%`, width: `${node.timing.durationInFrames / durationInFrames * 100}%`}}
              title={motionSummary ? `${node.name} · ${motionSummary}` : `${node.name} · 可拖入动效`}
              onPointerDown={(event) => beginTiming(event, node, "move")}
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
              {dropTarget && <span className="motion-drop-zones" aria-hidden="true"><b className={dropTarget.phase === "enter" ? "active" : ""}>入场</b><b className={dropTarget.phase === "loop" ? "active" : ""}>循环</b><b className={dropTarget.phase === "exit" ? "active" : ""}>退场</b></span>}
              <i className="timing-handle timing-end" onPointerDown={(event) => beginTiming(event, node, "trim-end")} />
            </button>
          </div>
        </div>;
      })}
    </div>
  </section>;
};
