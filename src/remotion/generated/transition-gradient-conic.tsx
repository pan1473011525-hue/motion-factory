// Adapted from Vincentwei1021/video-shotcraft (c) 2026, Apache License 2.0
// https://github.com/Vincentwei1021/video-shotcraft — demos/transition/gradient-transition/GradientTransition.tsx
// 改动：三层渐变交叉改为按形态拆分的纯 alpha 遮罩（本卡为锥形）；起始角度/软边参数化；
// 时间轴按 30fps 基准帧号换算；DesignStage 480×270 改为画布自适应。
import type {TransitionGradientConicProps} from "../../templates/transition-gradient-conic/manifest";
import {AlphaSurface} from "../primitives";
import {useCurrentFrame, useVideoConfig} from "remotion";

const ANIM_FRAMES = 60; // 遮罩动画总长（30fps 基准），之后持有全白

export const TransitionGradientConic: React.FC<TransitionGradientConicProps> = (props) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const f = (n: number) => Math.max(1, Math.round((n * fps) / 30));

  const anim = f(ANIM_FRAMES);
  const progress = Math.min(1, frame / anim);
  const {startAngle, edgeSoftness} = props;

  // 白扇形从起始角度顺时针扫 360°，渐变带宽度 = edgeSoftness 折算的角度
  const a = progress * 360;
  const soft = (edgeSoftness / 100) * 45;
  const background = `conic-gradient(from ${startAngle}deg, #fff 0%, #fff ${Math.min(a, 360)}deg, transparent ${Math.min(a + soft, 380)}deg, transparent 380deg)`;

  return (
    <AlphaSurface>
      <div style={{position: "absolute", inset: 0, background}} />
    </AlphaSurface>
  );
};
