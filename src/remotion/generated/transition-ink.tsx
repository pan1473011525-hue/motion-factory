// Adapted from Vincentwei1021/video-shotcraft (c) 2026, Apache License 2.0
// https://github.com/Vincentwei1021/video-shotcraft — demos/transition/print-texture-transitions/InkBleedReveal.tsx
// 改动：A/B 双画面改为纯 alpha 遮罩输出（白墨渍=不透明新画面区）；纹理种子/软边参数化；
// 时间轴按 30fps 基准帧号换算；坐标系改为 SVG 百分比 viewBox；useId 生成唯一 filter id。
import type {TransitionInkProps} from "../../templates/transition-ink/manifest";
import {AlphaSurface} from "../primitives";
import {Easing, interpolate, useCurrentFrame, useVideoConfig} from "remotion";
import {useId} from "react";

const ANIM_FRAMES = 60; // 遮罩动画总长（30fps 基准），之后持有全白
const R_MAX = 220; // viewBox 100 单位下覆盖对角

export const TransitionInk: React.FC<TransitionInkProps> = (props) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const f = (n: number) => Math.max(1, Math.round((n * fps) / 30));
  const filterId = `ink-${useId().replace(/[^a-zA-Z0-9_-]/gu, "")}`;

  const anim = f(ANIM_FRAMES);
  // 墨渍半径缓出扩散
  const radius = interpolate(frame, [0, anim], [0, R_MAX], {
    extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.out(Easing.quad),
  });
  // 扰动幅度 60→160，随扩散增强墨渗须边
  const displacement = interpolate(frame, [0, anim], [60, 160], {
    extrapolateLeft: "clamp", extrapolateRight: "clamp",
  });
  const {seed, edgeSoftness} = props;
  const strokeWidth = (edgeSoftness / 100) * 20;

  return (
    <AlphaSurface>
      <svg viewBox="0 0 100 100" preserveAspectRatio="none" style={{position: "absolute", inset: 0, width: "100%", height: "100%"}}>
        <defs>
          <filter id={filterId} x="-20%" y="-20%" width="140%" height="140%">
            <feTurbulence type="fractalNoise" baseFrequency="0.02" numOctaves="3" seed={seed} result="noise" />
            <feDisplacementMap in="SourceGraphic" in2="noise" scale={displacement} xChannelSelector="R" yChannelSelector="G" />
          </filter>
        </defs>
        <circle
          cx="50"
          cy="50"
          r={radius}
          fill="#fff"
          stroke="rgba(255,255,255,0.5)"
          strokeWidth={strokeWidth}
          filter={`url(#${filterId})`}
        />
      </svg>
    </AlphaSurface>
  );
};
