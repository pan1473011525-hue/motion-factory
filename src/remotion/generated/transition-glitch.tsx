// Adapted from Vincentwei1021/video-shotcraft (c) 2026, Apache License 2.0
// https://github.com/Vincentwei1021/video-shotcraft — demos/transition/tear-streak-transitions/GlitchDisplace.tsx
// 改动：画面位移撕裂重构为纯 alpha 遮罩（白横条分块随机扩张 + 确定性抖动 + 半透明错位残影）；
// 条数/抖动强度/软边参数化；时间轴按 30fps 基准帧号换算；坐标系画布自适应。
import type {TransitionGlitchProps} from "../../templates/transition-glitch/manifest";
import {AlphaSurface} from "../primitives";
import {useCurrentFrame, useVideoConfig} from "remotion";

const ANIM_FRAMES = 60; // 遮罩动画总长（30fps 基准），之后持有全白

// 确定性伪随机（禁 Math.random）
const rnd = (a: number): number => {
  const x = Math.sin(a * 127.3) * 43758.5453;
  return x - Math.floor(x);
};

export const TransitionGlitch: React.FC<TransitionGlitchProps> = (props) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const f = (n: number) => Math.max(1, Math.round((n * fps) / 30));

  const anim = f(ANIM_FRAMES);
  const progress = Math.min(1, frame / anim);
  const {barCount, intensity, edgeSoftness} = props;
  const barH = 100 / barCount;
  const soft = (edgeSoftness / 100) * (1 / barCount); // 软边占条高比例

  return (
    <AlphaSurface>
      <div style={{position: "absolute", inset: 0, display: "flex", flexDirection: "column"}}>
        {Array.from({length: barCount}).map((_, i) => {
          // 每条随机延迟（0–55% 动画时长内起手）+ 随机展开方向
          const delay = rnd(i * 3.1) * 0.55;
          const p = Math.min(1, Math.max(0, (progress - delay) / 0.4));
          const fromTop = rnd(i * 5.7) > 0.5;
          // 扩张中确定性抖动（每 3 帧跳动一次）
          const jitter = (rnd(i * 7.1 + Math.floor(frame / 3)) - 0.5) * 2 * intensity * 24;
          const jitterActive = p > 0 && p < 1;
          const clip = fromTop ? `inset(0 0 ${(1 - p) * 100}% 0)` : `inset(${(1 - p) * 100}% 0 0 0)`;
          const residualOpacity = intensity > 0 && p > 0 && p < 1 ? 0.35 * Math.min(1, intensity) * (1 - p) : 0;
          return (
            <div key={i} style={{
              position: "relative", width: "100%", height: `${barH}%`,
              background: "#fff", clipPath: clip,
              transform: jitterActive ? `translateX(${jitter}px)` : "translateX(0)",
            }}>
              {/* 软边：展开边缘半透明渐变 */}
              <div style={{
                position: "absolute", left: 0, right: 0,
                ...(fromTop ? {bottom: 0} : {top: 0}),
                height: `${soft * 100}%`,
                background: fromTop
                  ? `linear-gradient(180deg, #fff 0%, transparent ${100 / Math.max(1, soft * 100)}%)`
                  : `linear-gradient(0deg, #fff 0%, transparent ${100 / Math.max(1, soft * 100)}%)`,
              }} />
              {/* 错位残影（撕裂感） */}
              {residualOpacity > 0 && (
                <div style={{
                  position: "absolute", inset: 0, background: "rgba(255,255,255,1)",
                  opacity: residualOpacity, transform: `translateX(${jitter * -1.6}px)`,
                }} />
              )}
            </div>
          );
        })}
      </div>
    </AlphaSurface>
  );
};
