// Adapted from Vincentwei1021/video-shotcraft (c) 2026, Apache License 2.0
// https://github.com/Vincentwei1021/video-shotcraft — demos/typography/type-rhythm-sync/KaraokeFillSync.tsx
// 改动：两行文本参数化（原为硬编码词表）；词级时间表改为按词序自动分配（保持"词间停顿+读指下划线"语义）；
// 配色参数化；背景透明；时间轴按 30fps 基准帧号换算；坐标系画布自适应。
import type {KaraokeFillProps} from "../../templates/karaoke-fill/manifest";
import {AlphaSurface, ThemeProvider, useCanvasUnit} from "../primitives";
import {interpolate, useCurrentFrame, useVideoConfig} from "remotion";

const START = 20; // 第一个词开始帧（30fps 基准）
const ANIM = 130; // 全部词读完的帧

export const KaraokeFill: React.FC<KaraokeFillProps> = (props) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const unit = useCanvasUnit();
  const f = (n: number) => Math.max(1, Math.round((n * fps) / 30));

  const lines = [props.line1, props.line2];
  const words = lines.flatMap((line) => line.split(/\s+/).filter(Boolean));
  const total = Math.max(1, words.length);
  // 词级时间表：每词时长 = (ANIM-START)/total，词间 8% 停顿
  const perWord = (ANIM - START) / total;

  const wordTiming = (wordIndex: number): {start: number; end: number} => {
    const s = START + wordIndex * perWord;
    return {start: s, end: s + perWord * 0.92};
  };

  const KaraokeWord: React.FC<{text: string; wi: number}> = ({text, wi}) => {
    const {start, end} = wordTiming(wi);
    const p = interpolate(frame, [f(start), f(end)], [0, 1], {extrapolateLeft: "clamp", extrapolateRight: "clamp"});
    const active = frame >= f(start) && frame < f(end);
    return (
      <span style={{position: "relative", display: "inline-block"}}>
        <span style={{color: props.mutedColor}}>{text}</span>
        <span style={{position: "absolute", inset: 0, color: props.color, clipPath: `inset(0 ${(1 - p) * 100}% 0 0)`}}>{text}</span>
        {active && (
          <span style={{
            position: "absolute", left: 0, bottom: -14 * unit, width: `${p * 100}%`,
            height: 8 * unit, background: props.accentColor, borderRadius: 4 * unit,
          }} />
        )}
      </span>
    );
  };

  // 行内词布局（词间间距 + 行间换行）
  let wi = 0;
  return (
    <AlphaSurface>
      <ThemeProvider preset={props.stylePreset} accent={props.accentColor}>
        <div style={{
          position: "absolute", inset: 0, display: "flex", flexDirection: "column", justifyContent: "center",
          paddingLeft: 240 * unit, boxSizing: "border-box",
          fontSize: props.fontSize * unit, fontWeight: 800, letterSpacing: 2 * unit, lineHeight: 1.45,
        }}>
          {lines.map((line, li) => (
            <div key={li} style={{display: "flex", gap: 48 * unit, flexWrap: "wrap"}}>
              {line.split(/\s+/).filter(Boolean).map((w) => {
                const current = wi++;
                return <KaraokeWord key={`${li}-${current}`} text={w} wi={current} />;
              })}
            </div>
          ))}
        </div>
      </ThemeProvider>
    </AlphaSurface>
  );
};
