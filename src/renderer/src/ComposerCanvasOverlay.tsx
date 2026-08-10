import {useRef} from "react";
import type {ComposerComposition, ComposerNode} from "../../../packages/project-model/src";

type ResizeHandle = "move" | "n" | "s" | "e" | "w" | "ne" | "nw" | "se" | "sw";

type PointerSession = {
  pointerId: number;
  nodeId: string;
  mode: ResizeHandle;
  startClientX: number;
  startClientY: number;
  origin: ComposerNode;
  originScene: ComposerComposition;
  lastScene: ComposerComposition | null;
};

const clamp = (value: number, minimum: number, maximum: number): number => Math.min(maximum, Math.max(minimum, value));

const snapValue = (value: number, scene: ComposerComposition, enabled: boolean): number => {
  if (!scene.snapToGrid || !enabled) return value;
  const grid = scene.gridSize;
  const snapped = Math.round(value / grid) * grid;
  const magnetic = [0, 0.05, 0.5, 0.95, 1].find((guide) => Math.abs(value - guide) < Math.max(0.006, grid / 3));
  return magnetic ?? snapped;
};

const replaceNode = (scene: ComposerComposition, node: ComposerNode): ComposerComposition => ({
  ...scene,
  nodes: scene.nodes.map((candidate) => candidate.id === node.id ? node : candidate),
});

export const ComposerCanvasOverlay: React.FC<{
  composition: ComposerComposition;
  selectedNodeId: string | null;
  currentFrame: number;
  onSelect: (nodeId: string | null) => void;
  onPreview: (composition: ComposerComposition | null) => void;
  onCommit: (composition: ComposerComposition) => void;
}> = ({composition, selectedNodeId, currentFrame, onSelect, onPreview, onCommit}) => {
  const overlayRef = useRef<HTMLDivElement>(null);
  const pointerRef = useRef<PointerSession | null>(null);

  const beginPointer = (event: React.PointerEvent, node: ComposerNode, mode: ResizeHandle): void => {
    event.preventDefault();
    event.stopPropagation();
    onSelect(node.id);
    if (node.locked) return;
    overlayRef.current?.setPointerCapture(event.pointerId);
    pointerRef.current = {
      pointerId: event.pointerId,
      nodeId: node.id,
      mode,
      startClientX: event.clientX,
      startClientY: event.clientY,
      origin: structuredClone(node),
      originScene: structuredClone(composition),
      lastScene: null,
    };
  };

  const handlePointerMove = (event: React.PointerEvent<HTMLDivElement>): void => {
    const session = pointerRef.current;
    const bounds = overlayRef.current?.getBoundingClientRect();
    if (!session || !bounds || bounds.width <= 0 || bounds.height <= 0) return;
    const dx = (event.clientX - session.startClientX) / bounds.width;
    const dy = (event.clientY - session.startClientY) / bounds.height;
    const origin = session.origin.transform;
    let x = origin.x;
    let y = origin.y;
    let width = origin.width;
    let height = origin.height;
    const useSnap = !event.altKey;

    if (session.mode === "move") {
      x = clamp(snapValue(origin.x + dx, session.originScene, useSnap), 0, Math.max(0, 1 - width));
      y = clamp(snapValue(origin.y + dy, session.originScene, useSnap), 0, Math.max(0, 1 - height));
    } else {
      if (session.mode.includes("e")) width = clamp(snapValue(origin.width + dx, session.originScene, useSnap), 0.03, 1 - origin.x);
      if (session.mode.includes("s")) height = clamp(snapValue(origin.height + dy, session.originScene, useSnap), 0.03, 1 - origin.y);
      if (session.mode.includes("w")) {
        x = clamp(snapValue(origin.x + dx, session.originScene, useSnap), 0, origin.x + origin.width - 0.03);
        width = origin.width + origin.x - x;
      }
      if (session.mode.includes("n")) {
        y = clamp(snapValue(origin.y + dy, session.originScene, useSnap), 0, origin.y + origin.height - 0.03);
        height = origin.height + origin.y - y;
      }
    }
    const nextNode: ComposerNode = {...session.origin, transform: {...session.origin.transform, x, y, width, height}};
    const nextScene = replaceNode(session.originScene, nextNode);
    session.lastScene = nextScene;
    onPreview(nextScene);
  };

  const endPointer = (event: React.PointerEvent<HTMLDivElement>): void => {
    const session = pointerRef.current;
    if (!session || session.pointerId !== event.pointerId) return;
    if (overlayRef.current?.hasPointerCapture(event.pointerId)) overlayRef.current.releasePointerCapture(event.pointerId);
    pointerRef.current = null;
    onPreview(null);
    if (session.lastScene) onCommit(session.lastScene);
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLDivElement>): void => {
    if (!selectedNodeId || !["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"].includes(event.key)) return;
    const node = composition.nodes.find((candidate) => candidate.id === selectedNodeId);
    if (!node || node.locked) return;
    event.preventDefault();
    const amount = event.shiftKey ? 0.025 : 0.005;
    const x = clamp(node.transform.x + (event.key === "ArrowLeft" ? -amount : event.key === "ArrowRight" ? amount : 0), 0, Math.max(0, 1 - node.transform.width));
    const y = clamp(node.transform.y + (event.key === "ArrowUp" ? -amount : event.key === "ArrowDown" ? amount : 0), 0, Math.max(0, 1 - node.transform.height));
    onCommit(replaceNode(composition, {...node, transform: {...node.transform, x, y}}));
  };

  const activeNodes = composition.nodes.filter((node) => !node.hidden && currentFrame >= node.timing.from && currentFrame < node.timing.from + node.timing.durationInFrames);
  return <div
    ref={overlayRef}
    className="composer-canvas-overlay"
    tabIndex={0}
    aria-label="Composer 可交互画布"
    onPointerDown={(event) => {if (event.target === event.currentTarget) onSelect(null);}}
    onPointerMove={handlePointerMove}
    onPointerUp={endPointer}
    onPointerCancel={endPointer}
    onKeyDown={handleKeyDown}
  >
    {activeNodes.map((node) => {
      const selected = node.id === selectedNodeId;
      return <div
        key={node.id}
        className={`composer-node-box ${selected ? "selected" : ""} ${node.locked ? "locked" : ""}`}
        style={{left: `${node.transform.x * 100}%`, top: `${node.transform.y * 100}%`, width: `${node.transform.width * 100}%`, height: `${node.transform.height * 100}%`, rotate: `${node.transform.rotation}deg`, zIndex: 20_000 + node.transform.zIndex}}
        onPointerDown={(event) => beginPointer(event, node, "move")}
        aria-label={`${node.name}${node.locked ? "，已锁定" : ""}`}
      >
        {selected && <>
          <span className="composer-node-label">{node.name}</span>
          {(["nw", "n", "ne", "e", "se", "s", "sw", "w"] as const).map((handle) => <button type="button" tabIndex={-1} aria-label={`调整${handle}`} key={handle} className={`resize-handle handle-${handle}`} onPointerDown={(event) => beginPointer(event, node, handle)} />)}
        </>}
      </div>;
    })}
  </div>;
};
