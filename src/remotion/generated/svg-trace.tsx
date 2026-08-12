// Adapted from Vincentwei1021/video-shotcraft (c) 2026, Apache License 2.0
// https://github.com/Vincentwei1021/video-shotcraft — demos/ui-entrance/draw-svg-trace/DrawSvgTrace.tsx
// 改动：卡片内容参数化（标题/副标题文本替换灰阶占位条）；描边色参数化；背景透明；
// 时间轴按 30fps 基准帧号换算；坐标系画布自适应。描边生长/笔头/闭合闪烁/下划线逻辑保留。
import type {SvgTraceProps} from "../../templates/svg-trace/manifest";
import {AlphaSurface, ThemeProvider, useCanvasUnit} from "../primitives";
import {Easing, interpolate, useCurrentFrame, useVideoConfig} from "remotion";

const PEN = 0.045; // 笔头 dash 长度

export const SvgTrace: React.FC<SvgTraceProps> = (props) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const unit = useCanvasUnit();
  const f = (n: number) => Math.max(1, Math.round((n * fps) / 30));

  const CW = 560 * unit;
  const CH = 380 * unit;
  const CX = (1920 * unit - CW) / 2;
  const CY = (1080 * unit - CH) / 2;
  const accent = props.accentColor;
  const titleSize = props.fontSize * unit;

  // 轮廓描边进度：8–48，40f，inOut cubic
  const p = interpolate(frame, [f(8), f(48)], [0, 1], {extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.inOut(Easing.cubic)});
  // 闭合闪烁
  const flashUp = interpolate(frame, [f(48), f(50)], [0, 1], {extrapolateLeft: "clamp", extrapolateRight: "clamp"});
  const flashDown = interpolate(frame, [f(50), f(56)], [1, 0], {extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.out(Easing.quad)});
  const flash = frame < f(50) ? flashUp : flashDown;
  const strokeW = (4 + flash * 4) * unit;
  // 内容淡入 / 描边淡出 / border 接棒
  const contentOp = interpolate(frame, [f(48), f(56)], [0, 1], {extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.out(Easing.quad)});
  const traceOp = interpolate(frame, [f(54), f(64)], [1, 0], {extrapolateLeft: "clamp", extrapolateRight: "clamp"});
  const borderOp = 1 - traceOp;
  const penOp = p > 0.02 && p < 0.985 ? 1 : 0;
  // 标题下划线短版生长
  const up = interpolate(frame, [f(68), f(86)], [0, 1], {extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.out(Easing.cubic)});
  const upenOp = up > 0.03 && up < 0.97 ? 1 : 0;
  const UW = 300 * unit;

  return (
    <AlphaSurface>
      <ThemeProvider preset={props.stylePreset} accent={accent}>
        <div style={{position: "absolute", inset: 0, overflow: "hidden"}}>
          {/* 卡片内容 */}
          <div style={{
            position: "absolute", left: CX, top: CY, width: CW, height: CH, borderRadius: 14 * unit,
            background: "rgba(20,26,34,0.9)", boxShadow: "0 2px 8px rgba(0,0,0,0.4)",
            padding: 32 * unit, boxSizing: "border-box", display: "flex", flexDirection: "column",
            gap: 18 * unit, opacity: contentOp,
          }}>
            <div style={{fontSize: titleSize, fontWeight: 800, color: "#F7F9FB"}}>{props.title}</div>
            <div style={{height: 6 * unit}} />
            <div style={{fontSize: 26 * unit, color: "rgba(247,249,251,0.7)", lineHeight: 1.4}}>{props.subtitle}</div>
            <div style={{marginTop: "auto", display: "flex", gap: 12 * unit, alignItems: "center"}}>
              <div style={{width: 34 * unit, height: 34 * unit, borderRadius: 17 * unit, background: "rgba(255,255,255,0.4)"}} />
              <div style={{height: 12 * unit, width: 96 * unit, background: "rgba(255,255,255,0.3)", borderRadius: 6 * unit}} />
            </div>
          </div>
          {/* 卡片自身 border（描边淡出接棒） */}
          <div style={{
            position: "absolute", left: CX, top: CY, width: CW, height: CH, borderRadius: 14 * unit,
            border: `2px solid rgba(255,255,255,0.35)`, boxSizing: "border-box", opacity: borderOp,
          }} />
          {/* 描边生长层 */}
          {traceOp > 0.001 && (
            <svg width={CW} height={CH} style={{position: "absolute", left: CX, top: CY, overflow: "visible", opacity: traceOp}}>
              <rect x={1} y={1} width={CW - 2} height={CH - 2} rx={14 * unit} fill="none" stroke={accent} strokeWidth={strokeW} pathLength={1} strokeDasharray="1" strokeDashoffset={1 - p} strokeLinecap="round" />
              {penOp > 0 && (
                <rect x={1} y={1} width={CW - 2} height={CH - 2} rx={14 * unit} fill="none" stroke={accent} strokeWidth={7 * unit} pathLength={1} strokeDasharray={`${PEN} ${1 - PEN}`} strokeDashoffset={PEN - p} strokeLinecap="round" />
              )}
            </svg>
          )}
          {/* 标题下划线短版描边生长 */}
          {up > 0.001 && (
            <svg width={UW} height={8 * unit} style={{position: "absolute", left: CX + 32 * unit, top: CY + 32 * unit + titleSize + 10 * unit, overflow: "visible"}}>
              <line x1={0} y1={4 * unit} x2={UW} y2={4 * unit} stroke={accent} strokeWidth={4 * unit} pathLength={1} strokeDasharray="1" strokeDashoffset={1 - up} strokeLinecap="round" />
              {upenOp > 0 && (
                <line x1={0} y1={4 * unit} x2={UW} y2={4 * unit} stroke={accent} strokeWidth={7 * unit} pathLength={1} strokeDasharray={`${PEN * 2} ${1 - PEN * 2}`} strokeDashoffset={PEN * 2 - up} strokeLinecap="round" />
              )}
            </svg>
          )}
        </div>
      </ThemeProvider>
    </AlphaSurface>
  );
};
