// Adapted from Vincentwei1021/video-shotcraft (c) 2026, Apache License 2.0
// https://github.com/Vincentwei1021/video-shotcraft — demos/effects/glow-flyline-moves/FlylineArc.tsx
// 改动：占位 dashboard 背景替换为透明 + 可配置起止锚点（百分比）；飞线/端点色参数化；
// 时间轴按 30fps 基准帧号换算；坐标系画布自适应。贝塞尔飞线生长/亮头暗尾/目标脉冲逻辑保留。
import type {GlowFlylineProps} from "../../templates/glow-flyline/manifest";
import {AlphaSurface, ThemeProvider, useCanvasUnit} from "../primitives";
import {Easing, interpolate, useCurrentFrame, useVideoConfig} from "remotion";
import {useId} from "react";

type Pt = {x: number; y: number};

const bez = (p0: Pt, p1: Pt, p2: Pt, p3: Pt, t: number): Pt => {
  const u = 1 - t;
  return {
    x: u * u * u * p0.x + 3 * u * u * t * p1.x + 3 * u * t * t * p2.x + t * t * t * p3.x,
    y: u * u * u * p0.y + 3 * u * u * t * p1.y + 3 * u * t * t * p2.y + t * t * t * p3.y,
  };
};

const N = 100;
const DUR = 22; // 飞线生长时长（30fps 基准）
const START = 10; // 开始帧

export const GlowFlyline: React.FC<GlowFlylineProps> = (props) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const unit = useCanvasUnit();
  const f = (n: number) => Math.max(1, Math.round((n * fps) / 30));

  const haloId = `flyHalo-${useId().replace(/[^a-zA-Z0-9]/gu, "")}`;
  const W = 1920 * unit;
  const H = 1080 * unit;
  const accent = props.accentColor;

  // 锚点（画布坐标）
  const p0: Pt = {x: (props.startX / 100) * W, y: (props.startY / 100) * H};
  const p3: Pt = {x: (props.endX / 100) * W, y: (props.endY / 100) * H};
  // 控制点：弓形上抬（垂直方向抬 18% 画布高）
  const lift = -H * 0.18;
  const p1: Pt = {x: p0.x + (p3.x - p0.x) * 0.3, y: p0.y + lift};
  const p2: Pt = {x: p0.x + (p3.x - p0.x) * 0.7, y: p3.y + lift};

  const startF = f(START);
  const durF = f(DUR);
  const e = interpolate(frame, [startF, startF + durF], [0, 1], {easing: Easing.out(Easing.cubic), extrapolateLeft: "clamp", extrapolateRight: "clamp"});
  const growing = frame < startF + durF;
  const settle = interpolate(frame, [startF + durF, startF + durF + f(10)], [0, 1], {extrapolateLeft: "clamp", extrapolateRight: "clamp"});
  const visible = frame >= startF;

  // 目标点脉冲（到达后 18f）
  const at = startF + durF;
  const pulseAmp = frame <= at + f(6)
    ? interpolate(frame, [at, at + f(6)], [0, 1], {easing: Easing.out(Easing.cubic), extrapolateLeft: "clamp", extrapolateRight: "clamp"})
    : interpolate(frame, [at + f(6), at + f(18)], [1, 0], {extrapolateLeft: "clamp", extrapolateRight: "clamp"});
  const pulseOn = frame >= at && frame <= at + f(18);

  // 飞线采样
  const pts: Pt[] = [];
  const nDrawn = Math.max(2, Math.ceil(e * N) + 1);
  for (let i = 0; i < nDrawn; i++) pts.push(bez(p0, p1, p2, p3, Math.min(i / N, e)));
  pts[pts.length - 1] = bez(p0, p1, p2, p3, e);
  const underlay = pts.map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" ");
  const head = bez(p0, p1, p2, p3, e);

  const segs: React.ReactNode[] = [];
  for (let i = 0; i < pts.length - 1; i++) {
    const tSeg = Math.min(i / N, e) / Math.max(e, 0.001);
    const grad = 0.4 + 0.6 * tSeg * tSeg;
    const op = grad + (1 - grad) * settle;
    segs.push(<line key={i} x1={pts[i].x} y1={pts[i].y} x2={pts[i + 1].x} y2={pts[i + 1].y} stroke="#fafafa" strokeWidth={4.5 * unit} strokeLinecap="round" strokeOpacity={op} />);
  }

  return (
    <AlphaSurface>
      <ThemeProvider preset={props.stylePreset} accent={accent}>
        <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} style={{position: "absolute", top: 0, left: 0, pointerEvents: "none"}}>
          <defs>
            <radialGradient id={haloId}>
              <stop offset="0%" stopColor="rgba(255,255,255,0.5)" />
              <stop offset="55%" stopColor="rgba(255,255,255,0.2)" />
              <stop offset="100%" stopColor="rgba(255,255,255,0)" />
            </radialGradient>
          </defs>
          {/* 起点圆点 */}
          <circle cx={p0.x} cy={p0.y} r={10 * unit} fill="rgba(255,255,255,0.85)" stroke={accent} strokeWidth={3 * unit} />
          {/* 目标点 */}
          <circle cx={p3.x} cy={p3.y} r={14 * unit} fill={accent} />
          {pulseOn && (
            <circle cx={p3.x} cy={p3.y} r={(14 + pulseAmp * 46) * unit} fill="none" stroke={accent} strokeWidth={3 * unit} strokeOpacity={pulseAmp * 0.8} />
          )}
          {/* 飞线 */}
          {visible && (
            <g>
              <polyline points={underlay} fill="none" stroke="rgba(0,0,0,0.55)" strokeWidth={9 * unit} strokeLinecap="round" strokeLinejoin="round" strokeOpacity={0.92} />
              {segs}
              {growing && (
                <g>
                  <circle cx={head.x} cy={head.y} r={26 * unit} fill={`url(#${haloId})`} />
                  <circle cx={head.x} cy={head.y} r={9 * unit} fill="#ffffff" stroke={accent} strokeWidth={3 * unit} />
                </g>
              )}
            </g>
          )}
        </svg>
      </ThemeProvider>
    </AlphaSurface>
  );
};
