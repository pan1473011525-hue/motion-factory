export type MotionDropPhase = "enter" | "exit" | "loop";
export type MotionBoundary = "enter-end" | "exit-start";

const clamp = (value: number, minimum: number, maximum: number): number =>
  Math.min(maximum, Math.max(minimum, value));

export const frameFromTimelinePointer = (
  clientX: number,
  trackLeft: number,
  trackWidth: number,
  durationInFrames: number,
): number => {
  if (trackWidth <= 0 || durationInFrames <= 1) return 0;
  const progress = clamp((clientX - trackLeft) / trackWidth, 0, 1);
  return Math.round(progress * (durationInFrames - 1));
};

export type SnapResult = {
  frame: number;
  snapped: boolean;
};

/**
 * 把目标帧吸附到最近的吸附点(容差帧数内)。拖动时按住 Alt 可临时禁用。
 */
export const snapFrame = (
  frame: number,
  targets: ReadonlyArray<number>,
  tolerance = 6,
): SnapResult => {
  if (targets.length === 0) return {frame, snapped: false};
  let nearest = frame;
  let nearestDistance = Number.POSITIVE_INFINITY;
  for (const target of targets) {
    const distance = Math.abs(target - frame);
    if (distance < nearestDistance) {
      nearest = target;
      nearestDistance = distance;
    }
  }
  return nearestDistance <= tolerance
    ? {frame: nearest, snapped: true}
    : {frame, snapped: false};
};

export const chooseMotionDropPhase = (
  progress: number,
  phases: ReadonlyArray<MotionDropPhase>,
): MotionDropPhase | null => {
  if (phases.length === 0) return null;
  const normalized = clamp(progress, 0, 1);
  const preference: MotionDropPhase[] = normalized < 1 / 3
    ? ["enter", "loop", "exit"]
    : normalized > 2 / 3
      ? ["exit", "loop", "enter"]
      : ["loop", "enter", "exit"];
  return preference.find((phase) => phases.includes(phase)) ?? phases[0] ?? null;
};

/**
 * 将时间轴上的动效边界帧换算为现有入场/退场时长字段。
 * 边界始终限制在图层素材条内，至少保留 1 帧。
 */
export const motionDurationFromBoundaryFrame = (
  boundary: MotionBoundary,
  boundaryFrame: number,
  nodeFrom: number,
  nodeDuration: number,
): number => {
  const safeDuration = Math.max(1, nodeDuration);
  return boundary === "enter-end"
    ? clamp(boundaryFrame - nodeFrom, 1, safeDuration)
    : clamp(nodeFrom + safeDuration - boundaryFrame, 1, safeDuration);
};
