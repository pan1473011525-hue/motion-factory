// Adapted from Vincentwei1021/video-shotcraft (c) 2026, Apache License 2.0
// https://github.com/Vincentwei1021/video-shotcraft — demos/transition/wipe-transitions/ClockWipe.tsx
// 改动：A/B 双画面改为纯 alpha 遮罩输出；起始角度/软边参数化；时间轴按 30fps 基准帧号换算；
// 坐标系改为 SVG 百分比 viewBox（画布自适应）。
import type {TransitionWipeClockProps} from "../../templates/transition-wipe-clock/manifest";
import {AlphaSurface} from "../primitives";
import {useCurrentFrame, useVideoConfig} from "remotion";

const ANIM_FRAMES = 60; // 遮罩动画总长（30fps 基准），之后持有全白

const polar = (cx: number, cy: number, radius: number, angle: number): {x: number; y: number} => ({
  x: cx + radius * Math.cos(angle - Math.PI / 2),
  y: cy + radius * Math.sin(angle - Math.PI / 2),
});

export const TransitionWipeClock: React.FC<TransitionWipeClockProps> = (props) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const f = (n: number) => Math.max(1, Math.round((n * fps) / 30));

  const anim = f(ANIM_FRAMES);
  const progress = Math.min(1, frame / anim);
  const {startAngle, edgeSoftness} = props;

  const CX = 50;
  const CY = 50;
  const R = 220; // viewBox 100 单位下覆盖对角

  // 扫满 360° 时扇形起点终点重合，SVG 弧线失效——直接输出全白
  if (progress >= 0.999) {
    return (
      <AlphaSurface>
        <div style={{position: "absolute", inset: 0, background: "#fff"}} />
      </AlphaSurface>
    );
  }

  const sweep = (progress * 360 * Math.PI) / 180; // 弧度
  const start = (startAngle * Math.PI) / 180;
  const end = start + sweep;
  const startP = polar(CX, CY, R, start);
  const endP = polar(CX, CY, R, end);
  const largeArc = sweep > Math.PI ? 1 : 0;
  const path = `M ${CX} ${CY} L ${startP.x} ${startP.y} A ${R} ${R} 0 ${largeArc} 1 ${endP.x} ${endP.y} Z`;

  // 软边：扇形边缘半透明白描边（宽度按柔化比例）
  const strokeWidth = (edgeSoftness / 100) * 20;

  return (
    <AlphaSurface>
      <svg viewBox="0 0 100 100" preserveAspectRatio="none" style={{position: "absolute", inset: 0, width: "100%", height: "100%"}}>
        <path
          d={path}
          fill="#fff"
          stroke="rgba(255,255,255,0.5)"
          strokeWidth={strokeWidth}
          strokeLinejoin="round"
        />
      </svg>
    </AlphaSurface>
  );
};
