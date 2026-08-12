// Adapted from Vincentwei1021/video-shotcraft (c) 2026, Apache License 2.0
// https://github.com/Vincentwei1021/video-shotcraft — demos/data/gauge-readout-moves/NeedleSweepSelftest.tsx
// 改动：三个表盘目标值/标题/单位参数化；指针色参数化；背景透明（弃用灰阶占位底）；
// 时间轴按 30fps 基准帧号换算；坐标系画布自适应。刻度/红区/扫针/回摆逻辑保留。
import type {GaugeReadoutProps} from "../../templates/gauge-readout/manifest";
import {AlphaSurface, ThemeProvider, useCanvasUnit} from "../primitives";
import {Easing, interpolate, useCurrentFrame, useVideoConfig} from "remotion";

const RED = "#7c2d12";

// 表盘角 d∈[0,270] → 坐标
const polar = (cx: number, cy: number, a: number, r: number): [number, number] => [
  cx + r * Math.cos((a * Math.PI) / 180),
  cy + r * Math.sin((a * Math.PI) / 180),
];

export const GaugeReadout: React.FC<GaugeReadoutProps> = (props) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const unit = useCanvasUnit();
  const f = (n: number) => Math.max(1, Math.round((n * fps) / 30));

  const W = 1920 * unit;
  const CARD_W = 1500 * unit;
  const CARD_H = 640 * unit;
  const cardX = (W - CARD_W) / 2;
  const GA_W = CARD_W / 3;
  const R = 148 * unit;
  const CX = GA_W / 2;
  const CY = 240 * unit;
  const accent = props.accentColor;
  const values = [props.value1, props.value2, props.value3];
  const starts = [12, 16, 20];

  const arcPath = (d0: number, d1: number, r: number): string => {
    const [x0, y0] = polar(CX, CY, 135 + d0, r);
    const [x1, y1] = polar(CX, CY, 135 + d1, r);
    const large = d1 - d0 > 180 ? 1 : 0;
    return `M ${x0.toFixed(2)} ${y0.toFixed(2)} A ${r} ${r} 0 ${large} 1 ${x1.toFixed(2)} ${y1.toFixed(2)}`;
  };

  const needleAngle = (s: number, target: number): number => {
    if (frame <= f(s)) return 0;
    if (frame <= f(s + 12)) return interpolate(frame, [f(s), f(s + 12)], [0, 270], {easing: Easing.out(Easing.cubic)});
    if (frame <= f(s + 25)) return interpolate(frame, [f(s + 12), f(s + 25)], [270, target - 8], {easing: Easing.inOut(Easing.cubic)});
    return interpolate(frame, [f(s + 25), f(s + 32)], [target - 8, target], {easing: Easing.out(Easing.cubic), extrapolateRight: "clamp"});
  };

  return (
    <AlphaSurface>
      <ThemeProvider preset={props.stylePreset} accent={accent}>
        <div style={{position: "absolute", inset: 0}}>
          {/* 标题 */}
          <div style={{position: "absolute", top: 110 * unit, width: "100%", textAlign: "center", fontSize: 72 * unit, fontWeight: 800, letterSpacing: -1, color: "#F7F9FB"}}>
            {props.title}
          </div>
          {/* 卡片 */}
          <div style={{
            position: "absolute", left: cardX, top: 300 * unit, width: CARD_W, height: CARD_H,
            background: "rgba(20,26,34,0.9)", border: "2px solid rgba(255,255,255,0.14)", borderRadius: 14 * unit,
            boxSizing: "border-box", boxShadow: "0 2px 8px rgba(0,0,0,0.4)", padding: 32 * unit, display: "flex",
          }}>
            {values.map((rawTarget, i) => {
              const s = starts[i];
              const target = rawTarget * 2.7; // 0-100 → 0-270 度
              const d = needleAngle(s, target);
              const settle = f(s + 32);
              const value = Math.round(rawTarget);
              const popScale = interpolate(frame, [settle, settle + f(4), settle + f(8)], [0.3, 1.18, 1], {extrapolateLeft: "clamp", extrapolateRight: "clamp"});
              const popOp = interpolate(frame, [settle, settle + f(3)], [0, 1], {extrapolateLeft: "clamp", extrapolateRight: "clamp"});
              const [tipX, tipY] = polar(CX, CY, 135, R - 26 * unit);
              const [tailX, tailY] = polar(CX, CY, 315, 36 * unit);
              const ticks: React.ReactNode[] = [];
              for (let k = 0; k <= 30; k++) {
                const dd = k * 9;
                const major = k % 3 === 0;
                const a = 135 + dd;
                const [x0, y0] = polar(CX, CY, a, R - 8 * unit);
                const [x1, y1] = polar(CX, CY, a, major ? R - 30 * unit : R - 19 * unit);
                ticks.push(<line key={k} x1={x0} y1={y0} x2={x1} y2={y1} stroke={dd >= 225 ? RED : "rgba(255,255,255,0.4)"} strokeWidth={major ? 4 * unit : 2 * unit} />);
              }
              return (
                <div key={i} style={{width: GA_W, height: 480 * unit, position: "relative"}}>
                  <svg width={GA_W} height={430 * unit}>
                    <path d={arcPath(0, 270, R)} fill="none" stroke="rgba(255,255,255,0.18)" strokeWidth={10 * unit} strokeLinecap="round" />
                    <path d={arcPath(225, 270, R)} fill="none" stroke={RED} strokeWidth={10 * unit} strokeLinecap="round" opacity={0.85} />
                    {ticks}
                    <g transform={`rotate(${d.toFixed(3)} ${CX} ${CY})`}>
                      <line x1={tailX} y1={tailY} x2={tipX} y2={tipY} stroke={accent} strokeWidth={9 * unit} strokeLinecap="round" />
                    </g>
                    <circle cx={CX} cy={CY} r={15 * unit} fill="rgba(10,14,20,0.9)" />
                    <circle cx={CX} cy={CY} r={6 * unit} fill={accent} />
                  </svg>
                  <div style={{position: "absolute", left: 0, right: 0, top: 396 * unit, textAlign: "center", opacity: popOp, transform: `scale(${popScale.toFixed(4)})`}}>
                    <span style={{fontFamily: "Helvetica, Arial, sans-serif", fontWeight: 800, fontSize: 62 * unit, color: "#F7F9FB"}}>{value}</span>
                    <span style={{fontFamily: "Helvetica, Arial, sans-serif", fontWeight: 700, fontSize: 30 * unit, color: "rgba(255,255,255,0.5)", marginLeft: 8 * unit}}>{props.suffix}</span>
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
