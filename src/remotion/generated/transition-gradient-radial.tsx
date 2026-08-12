// Adapted from Vincentwei1021/video-shotcraft (c) 2026, Apache License 2.0
// https://github.com/Vincentwei1021/video-shotcraft — demos/transition/gradient-transition/GradientTransition.tsx
// 改动：三层渐变交叉改为按形态拆分的纯 alpha 遮罩（本卡为径向）；软边参数化；
// 时间轴按 30fps 基准帧号换算；DesignStage 480×270 改为画布自适应。
import type {TransitionGradientRadialProps} from "../../templates/transition-gradient-radial/manifest";
import {AlphaSurface} from "../primitives";
import {useCurrentFrame, useVideoConfig} from "remotion";

const ANIM_FRAMES = 60; // 遮罩动画总长（30fps 基准），之后持有全白

export const TransitionGradientRadial: React.FC<TransitionGradientRadialProps> = (props) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const f = (n: number) => Math.max(1, Math.round((n * fps) / 30));

  const anim = f(ANIM_FRAMES);
  const progress = Math.min(1, frame / anim);
  const {edgeSoftness} = props;

  // 白圆半径 0→130%（覆盖矩形），渐变带宽度按 edgeSoftness 折算
  const r1 = progress * 130;
  const soft = (edgeSoftness / 100) * 60;
  const background = `radial-gradient(circle at 50% 50%, #fff ${Math.max(0, r1 - 1)}%, #fff ${r1}%, transparent ${Math.min(r1 + soft, 140)}%, transparent 140%)`;

  return (
    <AlphaSurface>
      <div style={{position: "absolute", inset: 0, background}} />
    </AlphaSurface>
  );
};
