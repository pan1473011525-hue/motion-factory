// Adapted from Vincentwei1021/video-shotcraft (c) 2026, Apache License 2.0
// https://github.com/Vincentwei1021/video-shotcraft — demos/effects/scanline-annotate-focus/ScanlineAnnotateFocus.tsx
// 改动：标注词/强调色参数化；中性占位页简化为居中内容块 + 网格目标（不逐像素复刻 landing）；
// DesignStage 480×270 改为画布自适应；时间轴按 30fps 基准帧号换算；背景透明。
// 扫描线纵扫/取景框收拢/标注弹出/顶部计数逻辑保留。
import type {ScanlineAnnotateProps} from "../../templates/scanline-annotate/manifest";
import {AlphaSurface, ThemeProvider, useCanvasUnit} from "../primitives";
import {useCurrentFrame, useVideoConfig} from "remotion";

const E = {
  outCubic: (t: number) => 1 - Math.pow(1 - t, 3),
  outBack: (t: number, s = 1.70158) => 1 + (s + 1) * Math.pow(t - 1, 3) + s * Math.pow(t - 1, 2),
};
const lerp = (t: number, a: number, b: number) => a + (b - a) * t;
const seg = (t: number, t0: number, t1: number, ease: (x: number) => number = (x) => x) =>
  ease(Math.min(1, Math.max(0, (t - t0) / (t1 - t0))));

const MONO = "'SF Mono',Menlo,Consolas,monospace";
const ANIM = 138; // 总长（30fps 基准）

export const ScanlineAnnotate: React.FC<ScanlineAnnotateProps> = (props) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const unit = useCanvasUnit();
  const f = (n: number) => Math.max(1, Math.round((n * fps) / 30));

  const t = Math.min(1, frame / f(ANIM));
  const accent = props.accentColor;
  const items = props.items;
  const N = items.length;
  // 网格目标（设计坐标 480×270，等比 unit）
  const boxW = 480 * unit * 0.62;
  const boxH = 270 * unit * 0.62;
  const left0 = (480 * unit - boxW) / 2;
  const top0 = (270 * unit - boxH) / 2;
  const cols = Math.min(3, N);
  const rowsN = Math.ceil(N / cols);
  const targets = items.map((label, i) => {
    const c = i % cols;
    const r = Math.floor(i / cols);
    const w = boxW / cols - 12 * unit;
    const h = boxH / rowsN - 12 * unit;
    const x = left0 + c * (w + 12 * unit);
    const y = top0 + r * (h + 12 * unit);
    const ft = 0.1 + (i / Math.max(1, N)) * 0.5; // 触发时刻（扫描顺序）
    return {x, y, w, h, label, ft};
  });

  // 扫描线纵扫（y 从 -30 到 300，设计坐标 480×270 → 画布）
  const scanTop = lerp(seg(t, 0.06, 0.66), -30, 300) * unit;
  const lineOpacity = seg(t, 0.04, 0.09) * (1 - seg(t, 0.66, 0.71));
  const fired = targets.reduce((acc, tg) => acc + (seg(t, tg.ft, tg.ft + 0.11, E.outCubic) > 0 ? 1 : 0), 0);
  const done = seg(t, 0.74, 0.8);
  const C_BORDER = `1.5px solid rgba(242,243,245,0.95)`;
  const CORNERS: React.CSSProperties[] = [
    {left: 0, top: 0, borderTop: C_BORDER, borderLeft: C_BORDER},
    {right: 0, top: 0, borderTop: C_BORDER, borderRight: C_BORDER},
    {left: 0, bottom: 0, borderBottom: C_BORDER, borderLeft: C_BORDER},
    {right: 0, bottom: 0, borderBottom: C_BORDER, borderRight: C_BORDER},
  ];

  return (
    <AlphaSurface>
      <ThemeProvider preset={props.stylePreset} accent={accent}>
        <div style={{position: "absolute", inset: 0}}>
          {/* 中性占位内容块（简化 landing） */}
          <div style={{
            position: "absolute", inset: 0,
            background: "linear-gradient(180deg, rgba(16,17,22,0.96), rgba(12,13,17,0.96))",
          }}>
            <div style={{
              position: "absolute", left: 24 * unit, top: 30 * unit, width: 100 * unit, height: 18 * unit,
              font: `400 13px Georgia,serif`, color: "#eceef2", display: "flex", alignItems: "center", gap: 10 * unit,
            }}>
              <span style={{width: 18 * unit, height: 18 * unit, borderRadius: 9 * unit, background: accent, display: "inline-block"}} />
              Acme Studio
            </div>
            <div style={{
              position: "absolute", left: 24 * unit, top: 64 * unit, font: `400 29px Georgia,serif`, color: "#f2f3f6",
            }}>
              The headline for<br /><i>your product here</i>
            </div>
          </div>

          {/* 网格目标（内容块内） */}
          <div style={{position: "absolute", left: left0, top: top0, width: boxW, height: boxH}}>
            {targets.map((tg, i) => {
              const a = seg(t, tg.ft, tg.ft + 0.11, E.outCubic);
              const s = lerp(E.outBack(seg(t, tg.ft, tg.ft + 0.13)), 1.75, 1);
              const la = seg(t, tg.ft + 0.05, tg.ft + 0.16, E.outCubic);
              return (
                <div key={i}>
                  <div style={{
                    position: "absolute", left: tg.x, top: tg.y, width: tg.w, height: tg.h,
                    opacity: Math.min(1, a * 1.6), transform: `scale(${a > 0 ? s : 1.75})`,
                  }}>
                    {CORNERS.map((c, k) => (
                      <div key={k} style={{position: "absolute", width: 9 * unit, height: 9 * unit, boxSizing: "content-box", ...c}} />
                    ))}
                  </div>
                  <div style={{
                    position: "absolute", left: tg.x, top: tg.y + tg.h + 8 * unit,
                    font: `500 12px ${MONO}`, color: "#b8bdc7", letterSpacing: 1.5 * unit, whiteSpace: "nowrap",
                    opacity: la, transform: `translateY(${lerp(la, 4, 0) * unit}px)`,
                  }}>
                    {tg.label}
                  </div>
                </div>
              );
            })}
          </div>

          {/* 扫描线 */}
          <div style={{
            position: "absolute", left: 0, top: 0, width: "100%", height: 40 * unit,
            background: `linear-gradient(180deg,transparent,rgba(159,182,232,0.07) 55%,rgba(159,182,232,0.02) 96%,transparent)`,
            transform: `translateY(${scanTop - 40 * unit}px)`, opacity: lineOpacity,
          }}>
            <div style={{
              position: "absolute", bottom: 0, left: 0, width: "100%", height: 1.5 * unit,
              background: "rgba(238,244,255,0.9)", boxShadow: `0 0 7px ${accent},0 0 18px rgba(159,182,232,0.35)`,
            }} />
          </div>

          {/* 顶部状态行 */}
          <div style={{
            position: "absolute", left: "50%", top: 14 * unit, transform: "translateX(-50%)",
            font: `600 13px ${MONO}`, letterSpacing: 2 * unit, color: done >= 1 ? accent : "#8d93a0",
            opacity: seg(t, 0.03, 0.08),
          }}>
            {done >= 1 ? "ANALYSIS · COMPLETE" : `SCAN · ${String(fired).padStart(2, "0")}/${String(N).padStart(2, "0")}`}
          </div>
        </div>
      </ThemeProvider>
    </AlphaSurface>
  );
};
