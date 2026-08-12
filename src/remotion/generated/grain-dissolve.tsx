// Adapted from Vincentwei1021/video-shotcraft (c) 2026, Apache License 2.0
// https://github.com/Vincentwei1021/video-shotcraft — demos/outro/grain-dissolve/GrainDissolve.tsx
// 改动：原始文字/凝聚字标/字号/辉光色参数化；DesignStage 480×270 改为画布自适应（SVG viewBox 按画布比例）；
// 时间轴固定 60 帧（30fps 基准）归一化，不随时长拉伸；背景透明。feTurbulence 砂化/选区框/HUD 括角保留。
import type {GrainDissolveProps} from "../../templates/grain-dissolve/manifest";
import {AlphaSurface, ThemeProvider, useCanvasUnit} from "../primitives";
import {useCurrentFrame, useVideoConfig} from "remotion";
import {useId} from "react";

const E = {
  outCubic: (t: number) => 1 - Math.pow(1 - t, 3),
  inOutCubic: (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2),
};
const seg = (t: number, t0: number, t1: number, ease: (x: number) => number = (x) => x) =>
  ease(Math.min(1, Math.max(0, (t - t0) / (t1 - t0))));

const ANIM = 60; // 总长（30fps 基准）

const hexToRgb = (hex: string): string => {
  const r = Number.parseInt(hex.slice(1, 3), 16);
  const g = Number.parseInt(hex.slice(3, 5), 16);
  const b = Number.parseInt(hex.slice(5, 7), 16);
  return `${r},${g},${b}`;
};

export const GrainDissolve: React.FC<GrainDissolveProps> = (props) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const unit = useCanvasUnit();
  const f = (n: number) => Math.max(1, Math.round((n * fps) / 30));

  const t = Math.min(1, frame / f(ANIM));
  const uid = useId().replace(/[^a-zA-Z0-9]/gu, "");
  const fid = `gd-${uid}`;
  const cid = `gd-${uid}-clip`;
  const rgb = hexToRgb(props.accentColor);

  const burst = seg(t, 0.13, 0.28, E.outCubic);
  const cond = seg(t, 0.6, 0.71, E.inOutCubic);
  const lock = seg(t, 0.68, 0.9, E.outCubic);
  const settle = seg(t, 0.88, 1, E.outCubic);
  const glow = burst * 0.3 + cond * 0.7 - settle * 0.45;

  // 设计坐标 640×360 等比到画布
  const VW = 640;
  const VH = 360;
  const sx = 1920 * unit / VW;
  const sy = 1080 * unit / VH;
  const sc = Math.min(sx, sy); // 等比
  const BX = 128;
  const BY = 148;
  const BW = 384;
  const BH = 62;
  const HATCH_XS: number[] = [];
  for (let x = BX - BH; x < BX + BW; x += 34) HATCH_XS.push(x);

  const titleFont = Math.round(props.fontSize * unit / sc);
  const finalFont = Math.round(props.fontSize * 1.6 * unit / sc);

  return (
    <AlphaSurface>
      <ThemeProvider preset={props.stylePreset} accent={props.accentColor}>
        <svg viewBox={`0 0 ${VW} ${VH}`} style={{
          position: "absolute", inset: 0, width: "100%", height: "100%",
          transform: `scale(${1920 * unit / VW})`, transformOrigin: "top left",
        }}>
          <defs>
            <filter id={fid} x="-40%" y="-150%" width="180%" height="400%">
              <feTurbulence type="fractalNoise" baseFrequency={0.9 + burst * 0.4} numOctaves={2} seed={Math.floor(t * 46)} result="n" />
              <feDisplacementMap in="SourceGraphic" in2="n" scale={burst * 52 * (1 - lock)} xChannelSelector="R" yChannelSelector="G" result="d" />
              <feGaussianBlur in="d" stdDeviation={burst * 1.1 * (1 - lock)} />
            </filter>
          </defs>
          {/* HUD 括角 + 圆点 + 中线短划 */}
          <g>
            {[[88, 96, 1, 1], [552, 96, -1, 1], [88, 264, 1, -1], [552, 264, -1, -1]].map(([x, y, sx2, sy2], i) => (
              <g key={i}>
                <path d={`M${(x as number) + 14 * (sx2 as number)} ${y}H${x}V${(y as number) + 14 * (sy2 as number)}`} fill="none" stroke="rgba(255,255,255,0.45)" strokeWidth={1.5} />
                <circle cx={(x as number) + 34 * (sx2 as number)} cy={(y as number) + 28 * (sy2 as number)} r={1.6} fill="rgba(255,255,255,0.4)" />
              </g>
            ))}
            <line x1={52} y1={180} x2={76} y2={180} stroke="rgba(255,255,255,0.3)" strokeWidth={1.5} strokeDasharray="4 3" />
            <line x1={564} y1={180} x2={588} y2={180} stroke="rgba(255,255,255,0.3)" strokeWidth={1.5} strokeDasharray="4 3" />
          </g>
          {/* 选区框 */}
          <g opacity={burst * (1 - seg(t, 0.55, 0.64))}>
            <clipPath id={cid}>
              <rect x={BX} y={BY} width={BW} height={BH} />
            </clipPath>
            <g clipPath={`url(#${cid})`}>
              {HATCH_XS.map((x) => (
                <line key={x} x1={x} y1={BY + BH} x2={x + BH} y2={BY} stroke="rgba(255,255,255,0.2)" strokeWidth={1} />
              ))}
            </g>
            <rect x={BX} y={BY} width={BW} height={BH} fill="none" stroke="rgba(255,255,255,0.4)" strokeWidth={1} />
          </g>
          {/* 文字组 */}
          <g style={{filter: `url(#${fid}) drop-shadow(0 0 ${4 + glow * 20}px rgba(${rgb},${Math.max(0, glow) * 0.9}))`}}>
            <text x={320} y={191} textAnchor="middle" opacity={1 - cond} style={{fill: "#eceef2", font: `500 ${titleFont}px Inter,'Helvetica Neue',system-ui,sans-serif`, letterSpacing: "2.5px"}}>
              {props.text}
            </text>
            <text x={320} y={198} textAnchor="middle" opacity={cond} style={{fill: "#fff", font: `800 ${finalFont}px Inter,'Helvetica Neue',system-ui,sans-serif`, letterSpacing: "4px"}}>
              {props.finalText}
            </text>
          </g>
        </svg>
      </ThemeProvider>
    </AlphaSurface>
  );
};
