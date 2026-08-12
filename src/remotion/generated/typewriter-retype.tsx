// Adapted from Vincentwei1021/video-shotcraft (c) 2026, Apache License 2.0
// https://github.com/Vincentwei1021/video-shotcraft — demos/typography/typewriter-moves/TypewriterErrorRetype.tsx
// 改动：文本（text1/text2/保留前缀）与字号/配色参数化；背景透明；定位改为整行居中（左缘锚定最终句）；
// 时间轴按 30fps 基准帧号、运行时按实际 fps 换算。
import type {TypewriterRetypeProps} from "../../templates/typewriter-retype/manifest";
import {AlphaSurface, ThemeProvider, useCanvasUnit} from "../primitives";
import {useCurrentFrame, useVideoConfig} from "remotion";

const MONO = "'Courier New', 'SF Mono', ui-monospace, monospace";

// 节奏（30fps 基准）：打 2f/字符、删 1.5f/字符、重打 1.5f/字符
const TYPE1_RATE = 2;
const DEL_RATE = 1.5;
const TYPE2_RATE = 1.5;
const PAUSE_FRAMES = 16; // 犹豫停顿
const TAIL_FRAMES = 20; // 打完后的光标闪烁尾段

export const TypewriterRetype: React.FC<TypewriterRetypeProps> = (props) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const unit = useCanvasUnit();
  const f = (n: number) => Math.max(1, Math.round((n * fps) / 30));

  const text1 = props.text1;
  const text2 = props.text2;
  const keep = Math.min(props.keepLength, text1.length);
  const del = text1.length - keep;
  const fontSize = props.fontSize * unit;
  const ink = props.color;
  const accent = props.accentColor;

  // 时间轴
  const t1Start = f(2);
  const t1End = t1Start + (text1.length - 1) * f(TYPE1_RATE);
  const delStart = t1End + f(PAUSE_FRAMES);
  const delEnd = delStart + del * f(DEL_RATE);
  const t2Start = delEnd + f(3);
  const t2End = t2Start + (text2.length - 1) * f(TYPE2_RATE);
  const cursorOff = t2End + f(TAIL_FRAMES);

  // 帧确定文本状态
  const n1 = frame < t1Start ? 0 : Math.min(text1.length, Math.floor((frame - t1Start) / f(TYPE1_RATE)) + 1);
  const removed = frame < delStart ? 0 : Math.min(del, Math.floor((frame - delStart) / f(DEL_RATE)) + 1);
  const n2 = frame < t2Start ? 0 : Math.min(text2.length, Math.floor((frame - t2Start) / f(TYPE2_RATE)) + 1);
  const shown = text1.slice(0, Math.max(keep, n1 - removed)).slice(0, n1) + text2.slice(0, n2);

  // 光标：打字/删除常亮；停顿段 8f 周期闪；打完后 10f 周期闪两下；之后永灭
  const cursorOn = (): boolean => {
    if (frame >= cursorOff) return false;
    if (frame >= t2End) return Math.floor((frame - t2End) / f(5)) % 2 === 0;
    if (frame >= delStart) return true;
    if (frame >= t1End) return Math.floor((frame - t1End) / f(4)) % 2 === 0;
    return true;
  };

  // 等宽字符宽与整行居中（左缘锚定最终句，打字不横移）
  const charW = fontSize * 0.604;
  const finalText = text1.slice(0, keep) + text2;
  const totalW = finalText.length * charW;
  const left = (1920 * unit - totalW) / 2;
  const top = (1080 * unit - fontSize * 1.1) / 2;

  return (
    <AlphaSurface>
      <ThemeProvider preset={props.stylePreset} accent={accent}>
        <div style={{position: "absolute", left, top, display: "flex", alignItems: "center"}}>
          {shown.split("").map((c, i) => (
            <span key={i} style={{
              display: "inline-block", width: charW, textAlign: "center",
              fontFamily: MONO, fontSize, fontWeight: 700, color: ink, lineHeight: 1.1,
            }}>
              {c === " " ? "\u00A0" : c}
            </span>
          ))}
          {cursorOn() && (
            <span style={{
              display: "inline-block", width: fontSize * 0.07, height: fontSize * 0.95,
              marginLeft: fontSize * 0.05, background: accent,
            }} />
          )}
        </div>
      </ThemeProvider>
    </AlphaSurface>
  );
};
