// Adapted from Vincentwei1021/video-shotcraft (c) 2026, Apache License 2.0
// https://github.com/Vincentwei1021/video-shotcraft — demos/ui-entrance/list-reveal/ListReveal.tsx
// 改动：列表项/字号/强调色参数化（原为色相渐变，改为强调色派生）；DesignStage 480×270 改为画布自适应；
// 时间轴按 30fps 基准帧号换算；背景透明。逐项 outBack 过冲 + 整体漂移两层运动保留。
import type {ListRevealProps} from "../../templates/list-reveal/manifest";
import {AlphaSurface, ThemeProvider, useCanvasUnit} from "../primitives";
import {useCurrentFrame, useVideoConfig} from "remotion";

// 缓动表（源自上游 _fixtures/Motion.tsx 的 E，Apache-2.0）
const E = {
  outBack: (t: number, s = 1.70158) => 1 + (s + 1) * Math.pow(t - 1, 3) + s * Math.pow(t - 1, 2),
};
const lerp = (t: number, a: number, b: number) => a + (b - a) * t;
const seg = (t: number, t0: number, t1: number, ease: (x: number) => number = (x) => x) =>
  ease(Math.min(1, Math.max(0, (t - t0) / (t1 - t0))));

const hexToRgb = (hex: string): {r: number; g: number; b: number} => ({
  r: Number.parseInt(hex.slice(1, 3), 16),
  g: Number.parseInt(hex.slice(3, 5), 16),
  b: Number.parseInt(hex.slice(5, 7), 16),
});

const ANIM = 108; // 总长（30fps 基准）

export const ListReveal: React.FC<ListRevealProps> = (props) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const unit = useCanvasUnit();
  const f = (n: number) => Math.max(1, Math.round((n * fps) / 30));

  const t = Math.min(1, frame / f(ANIM));
  const fontSize = props.fontSize * unit;
  const rgb = hexToRgb(props.accentColor);

  return (
    <AlphaSurface>
      <ThemeProvider preset={props.stylePreset} accent={props.accentColor}>
        <div style={{position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center"}}>
          <div style={{
            position: "relative", width: 240 * unit, display: "flex", flexDirection: "column", gap: 9 * unit,
            transform: `translateY(${lerp(t, 16, -16) * unit}px)`,
          }}>
            {props.items.map((label, i) => {
              const p = seg(t, 0.06 + i * 0.09, 0.06 + i * 0.09 + 0.24, E.outBack);
              return (
                <div key={i} style={{
                  display: "flex", alignItems: "center", gap: 11 * unit,
                  padding: `${9 * unit}px ${13 * unit}px`, borderRadius: 10 * unit,
                  background: "rgba(22,26,38,0.92)", border: "1px solid rgba(38,44,64,0.9)",
                  opacity: Math.min(1, p * 2.2),
                  transform: `scale(${0.78 + Math.max(0, p) * 0.22}) translateY(${lerp(Math.max(0, p), 14, 0) * unit}px)`,
                }}>
                  <div style={{
                    width: 15 * unit, height: 15 * unit, borderRadius: 5 * unit, flex: "none",
                    background: `linear-gradient(140deg, rgba(${rgb.r},${rgb.g},${rgb.b},0.9), rgba(${rgb.r},${rgb.g},${rgb.b},0.55))`,
                  }} />
                  <div style={{fontWeight: 500, fontSize, lineHeight: 1, color: "#c6cde2", whiteSpace: "nowrap"}}>
                    {label}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </ThemeProvider>
    </AlphaSurface>
  );
};
