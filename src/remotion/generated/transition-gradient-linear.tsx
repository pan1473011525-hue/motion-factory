// Adapted from Vincentwei1021/video-shotcraft (c) 2026, Apache License 2.0
// https://github.com/Vincentwei1021/video-shotcraft — demos/transition/gradient-transition/GradientTransition.tsx
// 改动：三层渐变交叉改为按形态拆分的纯 alpha 遮罩（本卡为线性）；角度/软边参数化；
// 时间轴按 30fps 基准帧号换算；DesignStage 480×270 改为画布自适应。
import type {TransitionGradientLinearProps} from "../../templates/transition-gradient-linear/manifest";
import {AlphaSurface} from "../primitives";
import {useCurrentFrame, useVideoConfig} from "remotion";

const ANIM_FRAMES = 60; // 遮罩动画总长（30fps 基准），之后持有全白

export const TransitionGradientLinear: React.FC<TransitionGradientLinearProps> = (props) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const f = (n: number) => Math.max(1, Math.round((n * fps) / 30));

  const anim = f(ANIM_FRAMES);
  const progress = Math.min(1, frame / anim);
  const {angle, edgeSoftness} = props;

  // 白区边界从 0% 扫到 100%，渐变带宽度 = edgeSoftness%
  const p = progress * 100;
  const soft = edgeSoftness;
  const background = `linear-gradient(${angle}deg, #fff 0%, #fff ${Math.min(p, 100)}%, transparent ${Math.min(p + soft, 100)}%, transparent 100%)`;

  return (
    <AlphaSurface>
      <div style={{position: "absolute", inset: 0, background}} />
    </AlphaSurface>
  );
};
