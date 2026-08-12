// Adapted from Vincentwei1021/video-shotcraft (c) 2026, Apache License 2.0
// https://github.com/Vincentwei1021/video-shotcraft — demos/ui-entrance/card-stack/CardStack.tsx
// 改动：卡片数/卡片色参数化（原为色相列表，改为强调色派生渐变）；DesignStage 480×270 改为画布自适应；
// 时间轴按 30fps 基准帧号换算；背景透明。spring 弹入 + 扇形展开分层逻辑保留。
import type {CardStackProps} from "../../templates/card-stack/manifest";
import {AlphaSurface, ThemeProvider, useCanvasUnit} from "../primitives";
import {useCurrentFrame, useVideoConfig} from "remotion";

const GLYPHS = ["◆", "●", "▲", "■", "✦", "◐", "◇", "○"];

const E = {
  outCubic: (t: number) => 1 - Math.pow(1 - t, 3),
  inOutCubic: (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2),
  spring: (t: number, bounce = 0.25) => {
    const w = 8 + 8 * (1 - bounce);
    return 1 - Math.exp(-6 * t) * Math.cos(w * t * bounce * 2.2);
  },
};
const lerp = (t: number, a: number, b: number) => a + (b - a) * t;
const seg = (t: number, t0: number, t1: number, ease: (x: number) => number = (x) => x) =>
  ease(Math.min(1, Math.max(0, (t - t0) / (t1 - t0))));
const rand = (seed: number): number => {
  const x = Math.sin(seed * 127.1 + 311.7) * 43758.5453;
  return x - Math.floor(x);
};
const hexToRgb = (hex: string): {r: number; g: number; b: number} => ({
  r: Number.parseInt(hex.slice(1, 3), 16),
  g: Number.parseInt(hex.slice(3, 5), 16),
  b: Number.parseInt(hex.slice(5, 7), 16),
});

const ANIM = 126; // 总长（30fps 基准）

export const CardStack: React.FC<CardStackProps> = (props) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const unit = useCanvasUnit();
  const f = (n: number) => Math.max(1, Math.round((n * fps) / 30));

  const t = Math.min(1, frame / f(ANIM));
  const N = props.count;
  const rgb = hexToRgb(props.accentColor);

  return (
    <AlphaSurface>
      <ThemeProvider preset={props.stylePreset} accent={props.accentColor}>
        <div style={{position: "absolute", inset: 0, perspective: "900px", overflow: "hidden"}}>
          {Array.from({length: N}).map((_, i) => {
            const inT = seg(t, 0.02 + i * 0.033, 0.02 + i * 0.033 + 0.3);
            const y = lerp(E.spring(inT, 0.3), 300, 0);
            const fan = seg(t, 0.55, 0.8, E.inOutCubic);
            const k = i - (N - 1) / 2;
            const rot = k * 8 * fan;
            const tx = k * 34 * fan;
            const tz = -10 * Math.abs(k) * fan;
            const alpha = 0.45 - (Math.abs(k) / Math.max(1, N)) * 0.3;
            return (
              <div key={i} style={{
                position: "absolute", left: "50%", top: "50%",
                width: 110 * unit, height: 150 * unit, boxSizing: "border-box",
                margin: `${-85 * unit}px 0 0 ${-55 * unit}px`, borderRadius: 12 * unit,
                transformOrigin: "50% 130%",
                background: `linear-gradient(165deg, rgba(${rgb.r},${rgb.g},${rgb.b},${alpha + 0.3}), rgba(${rgb.r},${rgb.g},${rgb.b},${alpha}))`,
                border: `1px solid rgba(${rgb.r},${rgb.g},${rgb.b},0.55)`,
                boxShadow: "0 12px 34px rgba(0,0,0,0.5)",
                transform: `translate3d(${tx * unit}px,${y * unit}px,${tz * unit}px) rotate(${rot}deg)`,
                opacity: Math.min(1, inT * 4), zIndex: 20 - Math.abs(k * 2),
              }}>
                <div style={{position: "absolute", left: 12 * unit, top: 14 * unit, width: (40 + rand(i) * 40) * unit, height: 8 * unit, borderRadius: 4 * unit, background: `rgba(${rgb.r},${rgb.g},${rgb.b},0.7)`}} />
                <div style={{position: "absolute", left: 12 * unit, top: 30 * unit, width: (26 + rand(i + 9) * 30) * unit, height: 6 * unit, borderRadius: 3 * unit, background: `rgba(${rgb.r},${rgb.g},${rgb.b},0.35)`}} />
                <div style={{position: "absolute", left: "50%", top: "62%", transform: "translate(-50%,-50%)", fontSize: 30 * unit, color: `rgba(${rgb.r},${rgb.g},${rgb.b},0.9)`}}>
                  {GLYPHS[i % GLYPHS.length]}
                </div>
              </div>
            );
          })}
        </div>
      </ThemeProvider>
    </AlphaSurface>
  );
};
