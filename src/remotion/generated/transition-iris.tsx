// Adapted from Vincentwei1021/video-shotcraft (c) 2026, Apache License 2.0
// https://github.com/Vincentwei1021/video-shotcraft — demos/transition/circle-match-iris/CircleMatchIris.tsx
// 改动：A/B 双画面改为纯 alpha 遮罩输出；圆心/软边参数化（源码圆心为占位景特定值，改为百分比）；
// 时间轴按 30fps 基准帧号换算；坐标系改为 SVG 百分比 viewBox。
import type {TransitionIrisProps} from "../../templates/transition-iris/manifest";
import {AlphaSurface} from "../primitives";
import {Easing, interpolate, useCurrentFrame, useVideoConfig} from "remotion";

const ANIM_FRAMES = 60; // 遮罩动画总长（30fps 基准），之后持有全白
const R_MAX = 220; // viewBox 100 单位下覆盖对角

export const TransitionIris: React.FC<TransitionIrisProps> = (props) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const f = (n: number) => Math.max(1, Math.round((n * fps) / 30));

  const anim = f(ANIM_FRAMES);
  // 光圈半径缓出扩散
  const radius = interpolate(frame, [0, anim], [0, R_MAX], {
    extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.inOut(Easing.cubic),
  });
  const {centerX, centerY, edgeSoftness} = props;
  const strokeWidth = (edgeSoftness / 100) * 20;

  return (
    <AlphaSurface>
      <svg viewBox="0 0 100 100" preserveAspectRatio="none" style={{position: "absolute", inset: 0, width: "100%", height: "100%"}}>
        <circle
          cx={centerX}
          cy={centerY}
          r={radius}
          fill="#fff"
          stroke="rgba(255,255,255,0.5)"
          strokeWidth={strokeWidth}
        />
      </svg>
    </AlphaSurface>
  );
};
