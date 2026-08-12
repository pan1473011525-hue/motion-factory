// Adapted from Vincentwei1021/video-shotcraft (c) 2026, Apache License 2.0
// https://github.com/Vincentwei1021/video-shotcraft — demos/data/odometer-digit-roll/OdometerDigitRoll.tsx
// 改动：目标数位由 value 参数派生（整数位逐格滚动、小数/前后缀静态驻场）；字号/配色参数化；
// 背景透明（弃用灰阶占位底）；时间轴按 30fps 基准帧号、运行时按实际 fps 换算；坐标系画布自适应。
import type {OdometerRollProps} from "../../templates/odometer-roll/manifest";
import {AlphaSurface, ThemeProvider, useCanvasUnit} from "../primitives";
import {Easing, interpolate, useCurrentFrame, useVideoConfig} from "remotion";

const SPIN = 0.85; // 高速滚动速度：行/帧

// 位 i 的 strip 位置（单位：行，连续值）。纯帧函数，天然确定性。
const posAt = (f: number, d: number, s: number): number => {
  const p0 = SPIN * s;
  const T = Math.ceil((p0 + 6 - d) / 10) * 10 + d;
  if (f < s) return SPIN * Math.max(f, 0);
  if (f < s + 16) return interpolate(f, [s, s + 16], [p0, T + 0.5], {extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.out(Easing.cubic)});
  if (f < s + 22) return interpolate(f, [s + 16, s + 22], [T + 0.5, T], {extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.out(Easing.cubic)});
  return T;
};

export const OdometerRoll: React.FC<OdometerRollProps> = (props) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const unit = useCanvasUnit();
  const f = (n: number) => Math.max(1, Math.round((n * fps) / 30));

  const fontSize = props.fontSize * unit;
  const ROW = fontSize * 1.08; // 数位行高
  const DW = fontSize * 0.68; // 数位盒宽
  const ink = props.color;
  const accent = props.accentColor;

  // 目标数位
  const intDigits = String(Math.floor(props.value)).split("").map(Number);
  const decPart = props.decimals > 0 ? props.value.toFixed(props.decimals).split(".")[1] : "";
  const decDigits = decPart.split("").map(Number);

  // 数字居中：总宽 = 前缀 + 整数位 + 小数点 + 小数位 + 后缀
  const totalW = (props.prefix.length + intDigits.length + (decDigits.length > 0 ? 1 : 0) + decDigits.length + props.suffix.length) * DW;
  const left = (1920 * unit - totalW) / 2;
  const centerY = 1080 * unit * 0.5 - ROW / 2;

  // 锁定脉冲（末位锁定于 f63 附近）
  const pulseEnd = f(63);
  const pulseScale = interpolate(frame, [pulseEnd, pulseEnd + f(4), pulseEnd + f(8)], [1, 1.035, 1], {extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.inOut(Easing.quad)});
  const labelOp = interpolate(frame, [f(66), f(84)], [0, 1], {extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.out(Easing.quad)});

  // 一条 0–9 纵列 strip（两轮 20 格）
  const Strip: React.FC<{pos: number; color: string; opacity?: number; dy?: number}> = ({pos, color, opacity = 1, dy = 0}) => (
    <div style={{position: "absolute", left: 0, top: 0, width: DW, transform: `translateY(${-(pos % 10) * ROW + (dy ?? 0)}px)`, opacity}}>
      {Array.from({length: 20}).map((_, k) => (
        <div key={k} style={{width: DW, height: ROW, lineHeight: `${ROW}px`, textAlign: "center", fontSize, fontWeight: 800, fontVariantNumeric: "tabular-nums", color}}>{k % 10}</div>
      ))}
    </div>
  );

  // 单个数位盒：本体 + 滚动期错帧残影
  const DigitReel: React.FC<{i: number; digit: number}> = ({i, digit}) => {
    const pos = posAt(frame, digit, f(20 + i * 7));
    const prev = posAt(frame - 1, digit, f(20 + i * 7));
    const gate = interpolate(Math.abs(pos - prev), [0.06, 0.5], [0, 1], {extrapolateLeft: "clamp", extrapolateRight: "clamp"});
    return (
      <div style={{position: "relative", width: DW, height: ROW, overflow: "hidden"}}>
        {gate > 0.001 && (<>
          <Strip pos={pos} color={ink} opacity={0.25 * gate} dy={ROW * 0.5} />
          <Strip pos={pos} color={ink} opacity={0.12 * gate} dy={-ROW * 0.5} />
        </>)}
        <Strip pos={pos} color={ink} />
      </div>
    );
  };

  // 静态字符（前缀/小数点/小数位/后缀）
  const StaticGlyph: React.FC<{ch: string}> = ({ch}) => (
    <div style={{width: DW, height: ROW, lineHeight: `${ROW}px`, textAlign: "center", fontSize, fontWeight: 800, fontVariantNumeric: "tabular-nums", color: ink}}>{ch}</div>
  );

  let reelIndex = 0;
  return (
    <AlphaSurface>
      <ThemeProvider preset={props.stylePreset} accent={accent}>
        <div style={{position: "absolute", left: 0, top: 0, width: "100%", height: "100%"}}>
          {/* 顶部标签 */}
          <div style={{position: "absolute", top: 1080 * unit * 0.09, width: "100%", textAlign: "center", fontSize: 54 * unit, fontWeight: 800, letterSpacing: 2, color: ink, opacity: labelOp}}>
            {props.label}
          </div>
          {/* 数字行 */}
          <div style={{
            position: "absolute", left, top: centerY, display: "flex",
            transform: `scale(${pulseScale})`, transformOrigin: "center center",
          }}>
            {props.prefix.split("").map((ch, i) => <StaticGlyph key={`p${i}`} ch={ch} />)}
            {intDigits.map((d, i) => <DigitReel key={`i${i}`} i={reelIndex++} digit={d} />)}
            {decDigits.length > 0 && <StaticGlyph ch="." />}
            {decDigits.map((d, i) => <StaticGlyph key={`d${i}`} ch={String(d)} />)}
            {props.suffix.split("").map((ch, i) => <StaticGlyph key={`s${i}`} ch={ch} />)}
          </div>
          {/* 底部标签条 */}
          <div style={{position: "absolute", top: 1080 * unit * 0.68, width: "100%", display: "flex", flexDirection: "column", alignItems: "center", gap: 16 * unit, opacity: labelOp}}>
            <div style={{width: 520 * unit, height: 22 * unit, background: accent, borderRadius: 11 * unit, opacity: 0.7}} />
            <div style={{width: 320 * unit, height: 14 * unit, background: accent, borderRadius: 7 * unit, opacity: 0.35}} />
          </div>
        </div>
      </ThemeProvider>
    </AlphaSurface>
  );
};
