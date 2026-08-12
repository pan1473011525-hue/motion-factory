// Adapted from Vincentwei1021/video-shotcraft (c) 2026, Apache License 2.0
// https://github.com/Vincentwei1021/video-shotcraft — demos/typography/scramble/Scramble.tsx
// 改动：文本/字号/配色/字体参数化；DesignStage 480×270 改为画布自适应；锁定时刻由比例改为
// 固定动画段绝对帧（入场动画完成后持有，不随时长拉伸）；rand/seg 内联并保留 Apache 声明。
import type {TextScrambleProps} from "../../templates/text-scramble/manifest";
import {AlphaSurface, ThemeProvider, useCanvasUnit} from "../primitives";
import {useCurrentFrame, useVideoConfig} from "remotion";

const POOL = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789#$%&*+=<>/\\";
const ANIM_FRAMES = 96; // 入场动画总长（30fps 基准），之后持有
const SCRAMBLE_RATE = 2; // 每 2 帧换一个随机字符

// 确定性伪随机（等价 Remotion random(seed)，同种子跨帧/跨渲染可复现）
const rand = (seed: number): number => {
  const x = Math.sin(seed * 127.1 + 311.7) * 43758.5453;
  return x - Math.floor(x);
};

// 分段进度：t 在 [t0,t1] 内归一化，越界钳位
const seg = (t: number, t0: number, t1: number): number => Math.min(1, Math.max(0, (t - t0) / (t1 - t0)));

const hexToRgb = (hex: string): {r: number; g: number; b: number} => ({
  r: Number.parseInt(hex.slice(1, 3), 16),
  g: Number.parseInt(hex.slice(3, 5), 16),
  b: Number.parseInt(hex.slice(5, 7), 16),
});

const MONO = "'SF Mono', 'Menlo', ui-monospace, monospace";
const SANS = "-apple-system, BlinkMacSystemFont, 'SF Pro Display', 'PingFang SC', sans-serif";

export const TextScramble: React.FC<TextScrambleProps> = (props) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const unit = useCanvasUnit();
  const f = (n: number) => Math.max(1, Math.round((n * fps) / 30));

  const text = props.text;
  const chars = [...text];
  const anim = f(ANIM_FRAMES);
  const rate = f(SCRAMBLE_RATE);
  const fontFamily = props.fontFamily === "mono" ? MONO : SANS;
  const fontSize = props.fontSize * unit;
  const rgb = hexToRgb(props.accentColor);

  return (
    <AlphaSurface>
      <ThemeProvider preset={props.stylePreset} accent={props.accentColor}>
        <div style={{
          position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center",
          fontFamily, fontSize, letterSpacing: fontSize * 0.06, fontWeight: 700,
        }}>
          {chars.map((ch, i) => {
            let content = ch;
            let color = props.color;
            let textShadow = "none";
            if (ch !== " ") {
              // 锁定时刻：从左到右基础 stagger + 种子微扰
              const lockAt = (0.25 + (i / chars.length) * 0.6 + rand(i * 7) * 0.06) * anim;
              if (frame < anim * 0.06) {
                content = " "; // 开场短暂空白
              } else if (frame < lockAt) {
                // 高速跳字：每 rate 帧换一个随机字符
                content = POOL[Math.floor(rand(i * 131 + Math.floor(frame / rate)) * POOL.length)];
              } else {
                // 锁定为真字符，锁定瞬间闪高亮辉光后回落
                const flash = 1 - seg(frame, lockAt, lockAt + anim * 0.1);
                color = flash > 0.4 ? "#FFFFFF" : props.color;
                textShadow = `0 0 ${Math.round(flash * 18 * unit)}px rgba(${rgb.r},${rgb.g},${rgb.b},${Math.max(0, Math.min(1, flash))})`;
              }
            }
            return (
              <span key={i} style={{minWidth: "0.62em", textAlign: "center", color, textShadow}}>
                {content === " " ? "\u00A0" : content}
              </span>
            );
          })}
        </div>
      </ThemeProvider>
    </AlphaSurface>
  );
};
