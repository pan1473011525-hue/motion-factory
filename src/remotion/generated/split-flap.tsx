// Adapted from Vincentwei1021/video-shotcraft (c) 2026, Apache License 2.0
// https://github.com/Vincentwei1021/video-shotcraft — demos/typography/split-flap-title/SplitFlapFlip.tsx
// 改动：文本/字号/配色参数化；背景透明（弃用 FakeDashboard 压暗层）；格尺寸与字号联动并随文本长度自适应；
// 时间轴按 30fps 基准帧号、运行时按实际 fps 换算；accentColor 用于翻牌过程边缘高光。
import type {SplitFlapProps} from "../../templates/split-flap/manifest";
import {AlphaSurface, ThemeProvider, useCanvasUnit} from "../primitives";
import {Easing, interpolate, useCurrentFrame, useVideoConfig} from "remotion";

const CHARSET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789#$%&";
const START = 22; // 级联起始帧（30fps 基准）
const STAGGER = 4; // 字符间级联延迟
const FLIP = 5; // 单次翻牌时长
const NFLIP = 3; // 每字符翻 3 次（2 个乱码中间态 + 1 次落到目标字）

// seed 正弦哈希（禁 Math.random）
const rnd = (a: number): number => {
  const x = Math.sin(a * 127.3) * 43758.5453;
  return x - Math.floor(x);
};
const garble = (i: number, k: number): string =>
  CHARSET[Math.floor(rnd(i * 7.13 + k * 3.71 + 1) * CHARSET.length)];

const hexToRgb = (hex: string): {r: number; g: number; b: number} => ({
  r: Number.parseInt(hex.slice(1, 3), 16),
  g: Number.parseInt(hex.slice(3, 5), 16),
  b: Number.parseInt(hex.slice(5, 7), 16),
});

export const SplitFlap: React.FC<SplitFlapProps> = (props) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const unit = useCanvasUnit();
  const f = (n: number) => Math.max(1, Math.round((n * fps) / 30));

  const text = props.text;
  const chars = [...text];
  const baseFontSize = props.fontSize * unit;

  // 文本长度自适应：整行宽不超过画布 92%
  const cellWBase = baseFontSize * 1.18;
  const cellH = baseFontSize * 1.56;
  const gap = baseFontSize * 0.12;
  const spaceW = cellWBase * 0.44;
  const rowW = chars.reduce((w, ch) => w + (ch === " " ? spaceW : cellWBase) + gap, -gap);
  const maxW = 1920 * unit * 0.92;
  const scale = rowW > maxW ? maxW / rowW : 1;
  const fontSize = baseFontSize * scale;
  const cellW = cellWBase * scale;
  const halfH = cellH / 2;

  const FLAP_BG = props.cellColor;
  const FLAP_INK = props.inkColor;
  const accent = props.accentColor;
  const accentRgb = hexToRgb(accent);

  const startF = f(START);
  const staggerF = f(STAGGER);
  const flipF = f(FLIP);

  // 半格：上/下半各自 overflow hidden，内部整字定位错半格露出对应一半
  const Half: React.FC<{ch: string; part: "top" | "bottom"}> = ({ch, part}) => (
    <div style={{
      position: "absolute", left: 0, top: part === "top" ? 0 : halfH,
      width: cellW, height: halfH, overflow: "hidden", background: FLAP_BG,
      borderRadius: part === "top" ? `${fontSize * 0.1}px ${fontSize * 0.1}px 0 0` : `0 0 ${fontSize * 0.1}px ${fontSize * 0.1}px`,
    }}>
      <div style={{
        position: "absolute", left: 0, top: part === "top" ? 0 : -halfH,
        width: cellW, height: cellH, display: "flex", alignItems: "center", justifyContent: "center",
        fontFamily: "Helvetica, Arial, sans-serif", fontWeight: 800, fontSize, color: FLAP_INK,
      }}>
        {ch}
      </div>
    </div>
  );

  const FlapCell: React.FC<{target: string; i: number}> = ({target, i}) => {
    // 该格的字符序列：2 个乱码 → 1 个乱码 → 目标字
    const seq = [garble(i, 0), garble(i, 1), garble(i, 2), target];
    const local = frame - (startF + i * staggerF);
    const done = local >= NFLIP * flipF;

    // 停定咔哒：整格下沉回弹（放大到 6px 才有"咔哒"感）
    const clickY = done
      ? interpolate(local, [15, 17, 19, 22].map((n) => f(n)), [0, fontSize * 0.06, -fontSize * 0.015, 0], {
          extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.out(Easing.quad),
        })
      : 0;

    let topCh = seq[0];
    let bottomCh = seq[0];
    let flap: React.ReactNode = null;

    if (done) {
      topCh = target;
      bottomCh = target;
    } else if (local > 0) {
      const k = Math.min(NFLIP - 1, Math.floor(local / flipF));
      const from = seq[k];
      const to = seq[k + 1];
      const p = Easing.in(Easing.quad)((local - k * flipF) / flipF); // 重力感
      topCh = to;
      bottomCh = from;
      if (p < 0.5) {
        const deg = p * 2 * 90;
        flap = (
          <div style={{
            position: "absolute", inset: 0, transform: `rotateX(${-deg}deg)`,
            transformOrigin: `center ${halfH}px`, backfaceVisibility: "hidden",
            filter: `brightness(${1 - p * 2 * 0.45})`, zIndex: 2,
          }}>
            <Half ch={from} part="top" />
          </div>
        );
      } else {
        const deg = 90 - (p - 0.5) * 2 * 90;
        flap = (
          <div style={{
            position: "absolute", inset: 0, transform: `rotateX(${deg}deg)`,
            transformOrigin: `center ${halfH}px`, backfaceVisibility: "hidden",
            filter: `brightness(${0.55 + (p - 0.5) * 2 * 0.45})`, zIndex: 2,
          }}>
            <Half ch={to} part="bottom" />
          </div>
        );
      }
    }

    return (
      <div style={{
        position: "relative", width: cellW, height: cellH, transform: `translateY(${clickY}px)`,
        perspective: cellH * 2.7, borderRadius: fontSize * 0.1,
        boxShadow: !done && local > 0 ? `0 0 ${fontSize * 0.3}px rgba(${accentRgb.r},${accentRgb.g},${accentRgb.b},0.35)` : "0 6px 18px rgba(0,0,0,0.3)",
      }}>
        <Half ch={topCh} part="top" />
        <Half ch={bottomCh} part="bottom" />
        {flap}
        {/* 中缝铰链线 */}
        <div style={{
          position: "absolute", left: 0, top: halfH - fontSize * 0.02,
          width: cellW, height: fontSize * 0.04, background: accent, opacity: 0.55, zIndex: 3,
        }} />
      </div>
    );
  };

  let letterIdx = 0;
  return (
    <AlphaSurface>
      <ThemeProvider preset={props.stylePreset} accent={accent}>
        <div style={{position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center"}}>
          <div style={{display: "flex", gap, alignItems: "center"}}>
            {chars.map((ch, idx) => {
              if (ch === " ") return <div key={idx} style={{width: spaceW}} />;
              const i = letterIdx++;
              return <FlapCell key={idx} target={ch} i={i} />;
            })}
          </div>
        </div>
      </ThemeProvider>
    </AlphaSurface>
  );
};
