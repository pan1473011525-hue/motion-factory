// Adapted from Vincentwei1021/video-shotcraft (c) 2026, Apache License 2.0
// https://github.com/Vincentwei1021/video-shotcraft — demos/interaction/voice-waveform-live/VoiceWaveformLive.tsx
// 改动：声纹条数/颜色参数化；背景透明（弃用暗场绸缎底光）；时间轴按 30fps 基准帧号换算；
// 坐标系画布自适应。说→停→说→提交动画节奏保留。
import type {VoiceWaveformProps} from "../../templates/voice-waveform/manifest";
import {AlphaSurface, ThemeProvider, useCanvasUnit} from "../primitives";
import {Easing, interpolate, useCurrentFrame, useVideoConfig} from "remotion";

const mulberry32 = (a: number) => () => {
  let t = (a += 0x6d2b79f5);
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};

// 值噪声：整数采样点取种子随机值，采样点之间平滑插值
const noiseAt = (x: number): number => {
  const i = Math.floor(x);
  const fr = x - i;
  const a = mulberry32(i * 7919 + 13)();
  const b = mulberry32((i + 1) * 7919 + 13)();
  const s = fr * fr * (3 - 2 * fr);
  return a + (b - a) * s;
};

// 说话包络：说→停→说（帧号按 30fps 基准）
const envelope = (t: number): number => {
  const seg = (a: number, b: number, rise = 5, fall = 7) =>
    interpolate(t, [a, a + rise, b - fall, b], [0, 1, 1, 0], {extrapolateLeft: "clamp", extrapolateRight: "clamp"});
  const talk = Math.max(seg(15, 57), seg(80, 124));
  const syllable = 0.55 + 0.45 * noiseAt(t / 4.5 + 200);
  return talk * syllable;
};

export const VoiceWaveform: React.FC<VoiceWaveformProps> = (props) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const unit = useCanvasUnit();
  const f = (n: number) => Math.max(1, Math.round((n * fps) / 30));

  const N = props.barCount;
  const accent = props.accentColor;
  // W 由 1920*unit 派生

  // 提交动作（30fps 基准帧号）
  const submitAt = f(126);
  const submitted = frame >= submitAt;
  const btnPress = interpolate(frame, [submitAt, submitAt + f(3), submitAt + f(9)], [1, 0.82, 1], {extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.out(Easing.ease)});
  const collapse = interpolate(frame, [submitAt, submitAt + f(12)], [1, 0.06], {extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.in(Easing.ease)});
  const capsuleScale = interpolate(frame, [submitAt, submitAt + f(20)], [1, 0.96], {extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.out(Easing.ease)});
  const inOp = interpolate(frame, [0, f(12)], [0, 1], {extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.out(Easing.ease)});
  const inScale = interpolate(frame, [0, f(14)], [1.04, 1], {extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.out(Easing.cubic)});

  const SCROLL = 1.6;
  const bars = Array.from({length: N}).map((_, i) => {
    const sampleT = frame - (N - 1 - i) * SCROLL;
    const env = sampleT < 0 ? 0 : envelope(sampleT);
    const center = Math.pow(Math.sin((i / (N - 1)) * Math.PI), 0.8);
    const jitter = 0.35 + 0.65 * noiseAt(sampleT * 1.7 + i * 0.13);
    const hRaw = env * center * jitter;
    return Math.max(5 * unit, hRaw * 235 * unit * collapse);
  });
  const nowEnv = envelope(frame);
  const micGlow = submitted ? 0 : nowEnv;

  return (
    <AlphaSurface>
      <ThemeProvider preset={props.stylePreset} accent={accent}>
        <div style={{position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center"}}>
          <div style={{
            width: 1320 * unit, height: 300 * unit, borderRadius: 150 * unit, opacity: inOp,
            transform: `scale(${inScale * capsuleScale})`,
            background: "linear-gradient(180deg, rgba(255,255,255,0.5), rgba(255,255,255,0.08) 40%, rgba(0,0,0,0.3))",
            padding: 2.5 * unit, boxSizing: "border-box",
          }}>
            <div style={{
              width: "100%", height: "100%", borderRadius: 148 * unit, background: "rgba(24,25,29,0.72)",
              boxShadow: "inset 0 1px 0 rgba(255,255,255,0.10), 0 40px 100px rgba(0,0,0,0.55)",
              display: "flex", alignItems: "center", gap: 36 * unit, padding: `0 ${44 * unit}px`, boxSizing: "border-box",
            }}>
              {/* 麦克风圆钮 */}
              <div style={{
                width: 96 * unit, height: 96 * unit, borderRadius: 48 * unit, flexShrink: 0,
                background: `rgba(255,255,255,${0.08 + micGlow * 0.14})`,
                border: `2.5px solid rgba(255,255,255,0.28)`,
                boxShadow: `0 0 ${28 * micGlow * unit}px rgba(${accent},${micGlow * 0.5})`,
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 46 * unit, filter: "grayscale(1)", boxSizing: "border-box",
              }}>
                🎙️
              </div>
              {/* 声纹条区 */}
              <div style={{flex: 1, height: 244 * unit, display: "flex", alignItems: "center", gap: 6 * unit, overflow: "hidden"}}>
                {bars.map((h, i) => (
                  <div key={i} style={{flex: 1, height: h, borderRadius: 4 * unit, background: `rgba(240,240,248,${0.4 + (h / (235 * unit)) * 0.6})`, opacity: 0.9}} />
                ))}
              </div>
              {/* 提交钮 */}
              <div style={{
                width: 96 * unit, height: 96 * unit, borderRadius: 48 * unit, flexShrink: 0,
                background: submitted ? "#ffffff" : "rgba(255,255,255,0.92)", transform: `scale(${btnPress})`,
                display: "flex", alignItems: "center", justifyContent: "center",
                boxShadow: submitted ? "0 0 60px rgba(255,255,255,0.55)" : "0 8px 24px rgba(0,0,0,0.4)",
              }}>
                <svg width={44 * unit} height={44 * unit} viewBox="0 0 24 24">
                  <path d="M12 20V5M12 5l-6.5 6.5M12 5l6.5 6.5" stroke="#111114" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" fill="none" />
                </svg>
              </div>
            </div>
          </div>
        </div>
      </ThemeProvider>
    </AlphaSurface>
  );
};
