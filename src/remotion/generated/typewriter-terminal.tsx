// Adapted from Vincentwei1021/video-shotcraft (c) 2026, Apache License 2.0
// https://github.com/Vincentwei1021/video-shotcraft — demos/typography/typewriter-moves/TerminalTypewriter.tsx
// 改动：文本/字号/配色参数化；背景透明（弃用 FakeDashboard 占位景）；回车急推改为聚焦推近并高亮命令行；
// 时间轴按 30fps 基准帧号、运行时按实际 fps 换算；几何按画布短边缩放。
import type {TypewriterTerminalProps} from "../../templates/typewriter-terminal/manifest";
import {AlphaSurface, ThemeProvider, useCanvasUnit} from "../primitives";
import {Easing, interpolate, useCurrentFrame, useVideoConfig} from "remotion";

// 时间轴常量（30fps 基准帧数）
const TYPE_RATE = 2; // 2f/字符
const CURSOR_PERIOD = 12; // 12f 方波
const PAUSE = 12; // 敲完停顿
const PUSH = 6; // 回车急推
const BLUR = 2; // 推近末 2f 模糊
const START = 10; // 开始敲字

const MONO = "'SF Mono', 'Menlo', 'Consolas', ui-monospace, monospace";

export const TypewriterTerminal: React.FC<TypewriterTerminalProps> = (props) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const unit = useCanvasUnit();
  // 30fps 基准帧号 → 当前 fps 换算
  const f = (n: number) => Math.max(1, Math.round((n * fps) / 30));

  const text = props.text;
  const fontSize = props.fontSize * unit;
  const ink = props.color;
  const accent = props.accentColor;

  // 帧确定打字：2f/字符（打满后不再增长）
  const chars = Math.min(text.length, Math.max(0, Math.floor((frame - f(START)) / f(TYPE_RATE))));
  const typeEnd = f(START) + text.length * f(TYPE_RATE);
  const enter = typeEnd + f(PAUSE);
  const pushEnd = enter + f(PUSH);

  // 方块光标：12f 周期方波闪，回车后熄灭
  const cursorOn = frame < pushEnd && frame % f(CURSOR_PERIOD) < f(CURSOR_PERIOD / 2);

  // 回车聚焦推近：scale 1→1.06 以命令行中心为原点，末 2f blur 冲刺感
  const pushScale = interpolate(frame, [enter, pushEnd], [1, 1.06], {
    extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.in(Easing.cubic),
  });
  const pushBlur = interpolate(frame, [pushEnd - f(BLUR), pushEnd], [0, 3], {
    extrapolateLeft: "clamp", extrapolateRight: "clamp",
  });
  const entered = frame >= enter;

  // 几何（按画布缩放）
  const charW = fontSize * 0.62; // 等宽字符近似宽
  const promptW = charW * 2;
  const titlebarH = fontSize * 1.28;
  const historySize = fontSize * 0.72;
  const lineH = fontSize * 1.5;
  const padX = fontSize * 0.85;
  const padY = fontSize * 0.72;
  const contentW = promptW + text.length * charW;
  const winW = Math.max(fontSize * 12, Math.min(contentW + padX * 2, 1920 * unit * 0.92));
  const winH = titlebarH + historySize * 1.5 + lineH + padY * 2;
  const winX = (1920 * unit - winW) / 2;
  const winY = (1080 * unit - winH) / 2;

  // 可见字符数（受窗宽限制，超长文本自动截断展示）
  const visibleChars = Math.max(0, Math.floor((winW - padX * 2 - promptW) / charW));
  const shown = Math.min(chars, visibleChars);

  // 命令行中心（画布坐标，推近原点）
  const focusX = winX + padX + promptW + (shown * charW) / 2;
  const focusY = winY + titlebarH + historySize * 1.5 + lineH / 2;

  return (
    <AlphaSurface>
      <ThemeProvider preset={props.stylePreset} accent={accent}>
        <div style={{
          position: "absolute", inset: 0, display: "grid", placeItems: "center",
          transform: `scale(${pushScale})`, transformOrigin: `${focusX}px ${focusY}px`,
          ...(pushBlur > 0 ? {filter: `blur(${pushBlur}px)`} : {}),
        }}>
          {/* 终端窗 */}
          <div style={{
            width: winW, height: winH, background: "rgba(30,30,28,0.96)", borderRadius: fontSize * 0.35,
            boxShadow: "0 24px 64px rgba(0,0,0,0.35)", overflow: "hidden", boxSizing: "border-box",
          }}>
            {/* 标题栏：三圆点窗控 */}
            <div style={{
              height: titlebarH, background: "#2a2a28", borderBottom: "1px solid #3a3a38",
              display: "flex", alignItems: "center", gap: fontSize * 0.3, padding: `0 ${fontSize * 0.55}px`,
              boxSizing: "border-box",
            }}>
              {["#6a6a68", "#8f8f8d", "#b5b5b3"].map((c, i) => (
                <div key={i} style={{width: fontSize * 0.4, height: fontSize * 0.4, borderRadius: 999, background: c}} />
              ))}
              <div style={{margin: "0 auto", height: fontSize * 0.25, width: fontSize * 5, background: "#4a4a48", borderRadius: 99}} />
              <div style={{width: fontSize * 1.8}} />
            </div>
            {/* 内容区 */}
            <div style={{
              padding: `${padY}px ${padX}px`, fontFamily: MONO, fontSize, color: ink, lineHeight: 1.5, boxSizing: "border-box",
            }}>
              <div style={{color: "rgba(122,122,120,0.9)", fontSize: historySize, marginBottom: fontSize * 0.45}}>~/motioner-app (main)</div>
              <div style={{display: "flex", alignItems: "center", whiteSpace: "pre", color: entered ? accent : ink}}>
                <span style={{color: "#9f9f9d"}}>{"$ "}</span>
                <span>{text.slice(0, shown)}</span>
                <span style={{
                  display: "inline-block", width: fontSize * 0.5, height: lineH * 0.85, marginLeft: fontSize * 0.1,
                  background: entered ? accent : ink, opacity: cursorOn ? 1 : 0,
                }} />
              </div>
            </div>
          </div>
        </div>
      </ThemeProvider>
    </AlphaSurface>
  );
};
