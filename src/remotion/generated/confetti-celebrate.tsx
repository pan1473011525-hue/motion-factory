// Adapted from Vincentwei1021/video-shotcraft (c) 2026, Apache License 2.0
// https://github.com/Vincentwei1021/video-shotcraft — demos/data/particle-celebrate-hits/ConfettiCrossfire.tsx
// 改动：KPI 数值/标题/后缀参数化；彩屑强调色参数化（1/3 彩屑用强调色，其余灰阶）；背景透明；
// 时间轴按 30fps 基准帧号换算；坐标系画布自适应。彩屑弹道保留确定性闭式解。
import type {ConfettiCelebrateProps} from "../../templates/confetti-celebrate/manifest";
import {AlphaSurface, ThemeProvider, useCanvasUnit} from "../primitives";
import {Easing, interpolate, useCurrentFrame, useVideoConfig} from "remotion";

const FIRE = 16; // 揭晓帧 = 发射帧（30fps 基准）
const DECAY = 0.9;
const GRAV = 1.5;

const frac = (x: number) => x - Math.floor(x);
const rnd = (i: number, salt: number) => frac(Math.sin(i * 12.9898 + salt * 78.233) * 43758.5453);
const decaySum = (age: number) => (1 - Math.pow(DECAY, age)) / (1 - DECAY);

type Confetto = {vx: number; vy: number; w: number; h: number; spin: number; phase: number; amber: boolean; shade: string};
const grays = ["#6d6d6b", "#8f8f8d", "#4a4a48", "#b0b0ae"];

const makeGun = (originDeg: number, saltBase: number, unit: number): Confetto[] =>
  Array.from({length: 50}).map((_, i) => {
    const ang = ((originDeg + (rnd(i, saltBase) - 0.5) * 55) * Math.PI) / 180;
    const speed = 70 + rnd(i, saltBase + 1) * 25;
    return {
      vx: Math.cos(ang) * speed * unit,
      vy: -Math.sin(ang) * speed * unit,
      w: (14 + rnd(i, saltBase + 2) * 12) * unit,
      h: (8 + rnd(i, saltBase + 3) * 8) * unit,
      spin: 8 + rnd(i, saltBase + 4) * 7,
      phase: rnd(i, saltBase + 5) * 360,
      amber: rnd(i, saltBase + 6) < 1 / 3,
      shade: grays[Math.floor(rnd(i, saltBase + 7) * 4)],
    };
  });

export const ConfettiCelebrate: React.FC<ConfettiCelebrateProps> = (props) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const unit = useCanvasUnit();
  const f = (n: number) => Math.max(1, Math.round((n * fps) / 30));

  const W = 1920 * unit;
  const H = 1080 * unit;
  const age = frame - f(FIRE);
  const accent = props.accentColor;
  const LEFT_GUN = makeGun(60, 3, unit);
  const RIGHT_GUN = makeGun(120, 9, unit);
  const LEFT_POS = {x: 140 * unit, y: 1040 * unit};
  const RIGHT_POS = {x: 1780 * unit, y: 1040 * unit};

  // KPI 卡入场落定
  const cardScale = interpolate(frame, [0, f(14)], [0.6, 1], {easing: Easing.out(Easing.back(1.8)), extrapolateRight: "clamp"});
  const cardOp = interpolate(frame, [0, f(8)], [0, 1], {extrapolateRight: "clamp"});

  const renderGun = (gun: Confetto[], origin: {x: number; y: number}, keyBase: string) =>
    gun.map((c, i) => {
      if (age <= 0) return null;
      const s = decaySum(age);
      const x = origin.x + c.vx * s;
      const gDisp = (GRAV * (age - (DECAY - Math.pow(DECAY, age + 1)) / (1 - DECAY))) / (1 - DECAY);
      const y = origin.y + c.vy * s + gDisp * unit;
      if (y > H * 1.06 || x < -80 * unit || x > W * 1.05) return null;
      const rot = c.phase + c.spin * age;
      return (
        <div key={`${keyBase}${i}`} style={{
          position: "absolute", left: x, top: y, width: c.w, height: c.h,
          background: c.amber ? accent : c.shade, borderRadius: 2,
          transform: `rotate(${rot}deg) rotateX(${rot * 2.3}deg)`,
        }} />
      );
    });

  return (
    <AlphaSurface>
      <ThemeProvider preset={props.stylePreset} accent={accent}>
        <div style={{position: "absolute", inset: 0, overflow: "hidden"}}>
          {/* 标题 */}
          <div style={{position: "absolute", top: 110 * unit, width: "100%", textAlign: "center", fontSize: 72 * unit, fontWeight: 800, letterSpacing: -1, color: "#F7F9FB"}}>
            {props.title}
          </div>
          {/* 中央 KPI 卡 */}
          <div style={{
            position: "absolute", left: W / 2 - 300 * unit, top: 400 * unit, width: 600 * unit, height: 320 * unit,
            background: "rgba(20,26,34,0.9)", border: "2px solid rgba(255,255,255,0.14)", borderRadius: 16 * unit,
            boxSizing: "border-box", padding: 36 * unit, boxShadow: "0 4px 14px rgba(0,0,0,0.4)",
            display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
            transform: `scale(${cardScale})`, opacity: cardOp,
          }}>
            <div style={{fontSize: 150 * unit, fontWeight: 800, color: accent, letterSpacing: -3, lineHeight: 1.1, fontVariantNumeric: "tabular-nums"}}>
              {props.value.toLocaleString("zh-CN", {minimumFractionDigits: props.decimals, maximumFractionDigits: props.decimals})}{props.suffix}
            </div>
          </div>
          {renderGun(LEFT_GUN, LEFT_POS, "L")}
          {renderGun(RIGHT_GUN, RIGHT_POS, "R")}
        </div>
      </ThemeProvider>
    </AlphaSurface>
  );
};
