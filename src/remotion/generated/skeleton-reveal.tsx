// Adapted from Vincentwei1021/video-shotcraft (c) 2026, Apache License 2.0
// https://github.com/Vincentwei1021/video-shotcraft — demos/ui-entrance/skeleton-reveal/SkeletonReveal.tsx
// 改动：消息列表/头像色参数化；背景透明（弃用纸色底）；时间轴按 30fps 基准帧号换算；
// 坐标系画布自适应。涂鸦煮沸→骨架窗弹入→逐行逐词显影三段逻辑保留。
import type {SkeletonRevealProps} from "../../templates/skeleton-reveal/manifest";
import {AlphaSurface, ThemeProvider, useCanvasUnit} from "../primitives";
import {Easing, interpolate, spring, useCurrentFrame, useVideoConfig} from "remotion";

const mulberry32 = (a: number) => () => {
  let t = (a += 0x6d2b79f5);
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};

const wobbleLine = (x1: number, y1: number, x2: number, y2: number, seed: number, amp = 7, segs = 8): string => {
  const rnd = mulberry32(seed);
  const pts: string[] = [];
  for (let i = 0; i <= segs; i++) {
    const t = i / segs;
    const jx = (rnd() - 0.5) * amp * 2;
    const jy = (rnd() - 0.5) * amp * 2;
    pts.push(`${i === 0 ? "M" : "L"} ${x1 + (x2 - x1) * t + jx} ${y1 + (y2 - y1) * t + jy}`);
  }
  return pts.join(" ");
};

const wobbleBlobRect = (x: number, y: number, w: number, h: number, seed: number, amp = 10, r = 70): string => {
  const rnd = mulberry32(seed);
  const j = () => (rnd() - 0.5) * amp * 2;
  return [
    `M ${x + r + j()} ${y + j()}`, `L ${x + w / 2 + j()} ${y + j()}`, `L ${x + w - r + j()} ${y + j()}`,
    `Q ${x + w + j()} ${y + j()} ${x + w + j()} ${y + r + j()}`, `L ${x + w + j()} ${y + h / 2 + j()}`, `L ${x + w + j()} ${y + h - r + j()}`,
    `Q ${x + w + j()} ${y + h + j()} ${x + w - r + j()} ${y + h + j()}`, `L ${x + w / 2 + j()} ${y + h + j()}`, `L ${x + r + j()} ${y + h + j()}`,
    `Q ${x + j()} ${y + h + j()} ${x + j()} ${y + h - r + j()}`, `L ${x + j()} ${y + h / 2 + j()}`, `L ${x + j()} ${y + r + j()}`,
    `Q ${x + j()} ${y + j()} ${x + r + j()} ${y + j()}`,
  ].join(" ");
};

const wobbleCircle = (cx: number, cy: number, r: number, seed: number, amp = 6): string => {
  const rnd = mulberry32(seed);
  const n = 14;
  const pts: string[] = [];
  for (let i = 0; i <= n; i++) {
    const a = (i / n) * Math.PI * 2;
    const rr = r + (rnd() - 0.5) * amp * 2;
    pts.push(`${i === 0 ? "M" : "L"} ${cx + Math.cos(a) * rr} ${cy + Math.sin(a) * rr}`);
  }
  return pts.join(" ") + " Z";
};

export const SkeletonReveal: React.FC<SkeletonRevealProps> = (props) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const unit = useCanvasUnit();
  const f = (n: number) => Math.max(1, Math.round((n * fps) / 30));

  const W = 1920 * unit;
  const H = 1080 * unit;
  const SWAP = f(32);
  const accent = props.accentColor;

  // 涂鸦：煮沸抖动 + 一拍内缩退离场
  const boil = Math.floor(frame / f(5));
  const doodleOut = interpolate(frame, [SWAP, SWAP + f(8)], [0, 1], {extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.in(Easing.cubic)});
  const doodleVisible = frame < SWAP + f(9);

  // 骨架窗口弹入
  const winIn = spring({frame: frame - SWAP, fps, config: {damping: 16, stiffness: 160, mass: 0.7}});
  const rowSlide = (i: number) => interpolate(frame, [SWAP + f(12) + i * f(6), SWAP + f(34) + i * f(6)], [520 * unit, 0], {extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.out(Easing.cubic)});
  const zoom = interpolate(frame, [f(66), f(142)], [1, 1.34], {extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.inOut(Easing.cubic)});
  const devAt = (i: number) => interpolate(frame, [f(80) + i * f(13), f(92) + i * f(13)], [0, 1], {extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.out(Easing.quad)});

  const rows = props.items;
  const wordAt = (row: number) => (w: number, n: number) => {
    const isLastWordOfLastRow = row === rows.length - 1 && w === n - 1;
    const start = f(82) + row * f(13) + w * f(2.5) + (isLastWordOfLastRow ? f(14) : 0);
    return interpolate(frame, [start, start + f(9)], [0, 1], {extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.out(Easing.cubic)});
  };

  return (
    <AlphaSurface>
      <ThemeProvider preset={props.stylePreset} accent={accent}>
        {/* 骨架 UI 窗口 */}
        {frame >= SWAP && (
          <div style={{position: "absolute", inset: 0, transform: `scale(${zoom})`, transformOrigin: "58% 46%"}}>
            <div style={{
              position: "absolute", left: 250 * unit, top: 140 * unit, width: 1420 * unit, height: 800 * unit,
              background: "rgba(255,255,255,0.92)", border: "2px solid rgba(216,216,214,0.6)", borderRadius: 22 * unit,
              overflow: "hidden", display: "flex", boxShadow: "0 12px 40px rgba(0,0,0,0.2)",
              opacity: Math.min(1, winIn * 2),
              transform: `scale(${interpolate(winIn, [0, 1], [1.08, 1])})`,
            }}>
              {/* 侧栏 */}
              <div style={{width: 300 * unit, background: "#3a3a3a", padding: `${30 * unit}px ${26 * unit}px`, boxSizing: "border-box", display: "flex", flexDirection: "column", gap: 22 * unit}}>
                <div style={{width: 46 * unit, height: 46 * unit, borderRadius: 12 * unit, background: "#777775"}} />
                {Array.from({length: 7}).map((_, i) => (
                  <div key={i} style={{height: 13 * unit, width: `${55 + ((i * 37) % 40)}%`, background: "#5a5a58", borderRadius: 7 * unit}} />
                ))}
              </div>
              {/* 主区 */}
              <div style={{flex: 1, display: "flex", flexDirection: "column"}}>
                <div style={{height: 72 * unit, borderBottom: "2px solid rgba(228,228,226,0.8)", display: "flex", alignItems: "center", padding: `0 ${34 * unit}px`}}>
                  <div style={{height: 18 * unit, width: 230 * unit, background: "#d5d5d3", borderRadius: 9 * unit}} />
                </div>
                <div style={{flex: 1, padding: `${30 * unit}px ${40 * unit}px`, display: "flex", flexDirection: "column", gap: 32 * unit, overflow: "hidden"}}>
                  {rows.map((row, i) => {
                    const dev = devAt(i);
                    const words = row.message.split(" ");
                    return (
                      <div key={i} style={{transform: `translateY(${rowSlide(i)}px)`, opacity: rowSlide(i) > 500 * unit ? 0 : 1}}>
                        <div style={{position: "relative", height: 96 * unit}}>
                          {/* 骨架层 */}
                          <div style={{position: "absolute", inset: 0, display: "flex", gap: 22 * unit, opacity: 1 - dev}}>
                            <div style={{width: 72 * unit, height: 72 * unit, borderRadius: 16 * unit, background: "#d5d5d3"}} />
                            <div style={{flex: 1, display: "flex", flexDirection: "column", gap: 14 * unit, paddingTop: 6 * unit}}>
                              <div style={{height: 18 * unit, width: (180 + ((i * 67) % 90)) * unit, background: "#d5d5d3", borderRadius: 9 * unit}} />
                              <div style={{height: 16 * unit, width: `${58 + ((i * 31) % 30)}%`, background: "#e2e2e0", borderRadius: 8 * unit}} />
                            </div>
                          </div>
                          {/* 内容层（逐词显影） */}
                          <div style={{position: "absolute", inset: 0, display: "flex", gap: 22 * unit, opacity: dev > 0.02 ? 1 : 0}}>
                            <div style={{
                              width: 72 * unit, height: 72 * unit, borderRadius: 16 * unit, background: accent,
                              color: "#fff", display: "flex", alignItems: "center", justifyContent: "center",
                              fontSize: 32 * unit, fontWeight: 800, opacity: dev, transform: `scale(${0.7 + 0.3 * dev})`,
                            }}>
                              {row.name[0]}
                            </div>
                            <div style={{flex: 1, paddingTop: 2 * unit}}>
                              <div style={{fontSize: 26 * unit, fontWeight: 800, color: "#2f2f2f", opacity: dev}}>
                                {row.name}
                              </div>
                              <div style={{fontSize: 27 * unit, color: "#3c3c3a", marginTop: 8 * unit}}>
                                {words.map((w, wi) => {
                                  const p = wordAt(i)(wi, words.length);
                                  return (
                                    <span key={wi} style={{display: "inline-block", marginRight: 9 * unit, opacity: p, transform: `translateY(${(1 - p) * 14 * unit}px)`}}>
                                      {w}
                                    </span>
                                  );
                                })}
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 手绘涂鸦占位（第一拍，缩退让位） */}
        {doodleVisible && (
          <div style={{
            position: "absolute", inset: 0, opacity: 1 - doodleOut,
            transform: `scale(${1 - doodleOut * 0.14})`,
          }}>
            <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} style={{position: "absolute", inset: 0}}>
              {(() => {
                const S = boil * 977;
                const stroke = {fill: "none" as const, stroke: "#2f2f2f", strokeLinecap: "round" as const, strokeLinejoin: "round" as const};
                const K = unit; // 涂鸦以 1920×1080 基准坐标绘制
                return (
                  <>
                    <path d={wobbleBlobRect(250 * K, 140 * K, 1420 * K, 800 * K, S + 1)} {...stroke} strokeWidth={14 * K} />
                    <path d={wobbleLine(600 * K, 160 * K, 600 * K, 920 * K, S + 2)} {...stroke} strokeWidth={12 * K} />
                    <path d={wobbleCircle(420 * K, 260 * K, 52 * K, S + 3)} {...stroke} strokeWidth={12 * K} />
                    {Array.from({length: 6}).map((_, i) => (
                      <path key={`sb${i}`} d={wobbleLine(330 * K, (400 + i * 82) * K, (470 + ((i * 53) % 70)) * K, (400 + i * 82) * K, S + 10 + i)} {...stroke} strokeWidth={11 * K} />
                    ))}
                    {Array.from({length: 4}).map((_, i) => {
                      const y = 320 + i * 160;
                      return (
                        <g key={`row${i}`}>
                          <path d={wobbleCircle(720 * K, y * K, 44 * K, S + 30 + i)} {...stroke} strokeWidth={12 * K} />
                          <path d={wobbleLine(810 * K, (y - 28) * K, (1180 + ((i * 97) % 220)) * K, (y - 28) * K, S + 40 + i)} {...stroke} strokeWidth={11 * K} />
                          <path d={wobbleLine(810 * K, (y + 24) * K, (1420 - ((i * 71) % 260)) * K, (y + 24) * K, S + 50 + i)} {...stroke} strokeWidth={11 * K} />
                        </g>
                      );
                    })}
                  </>
                );
              })()}
            </svg>
          </div>
        )}
      </ThemeProvider>
    </AlphaSurface>
  );
};
