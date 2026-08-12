// Adapted from Vincentwei1021/video-shotcraft (c) 2026, Apache License 2.0
// https://github.com/Vincentwei1021/video-shotcraft — demos/transition/wipe-transitions/BlindsSlice.tsx
// 改动：A/B 双画面改为纯 alpha 遮罩输出（白色=不透明的新画面区，透明=旧画面区）；条数/方向/软边参数化；
// 逐条级联展开；时间轴按 30fps 基准帧号、运行时按实际 fps 换算；坐标系改为画布自适应。
import type {TransitionWipeBlindsProps} from "../../templates/transition-wipe-blinds/manifest";
import {AlphaSurface} from "../primitives";
import {useCurrentFrame, useVideoConfig} from "remotion";

const ANIM_FRAMES = 60; // 遮罩动画总长（30fps 基准），之后持有全白

export const TransitionWipeBlinds: React.FC<TransitionWipeBlindsProps> = (props) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const f = (n: number) => Math.max(1, Math.round((n * fps) / 30));

  const anim = f(ANIM_FRAMES);
  const progress = Math.min(1, frame / anim);
  const {stripCount, direction, edgeSoftness} = props;
  const vertical = direction === "vertical"; // 竖条：自左向右展开；横条：自上向下展开

  // 每条展开：60% 动画时长内依次起手，40% 完成；条 i 延迟 (i/N)*0.6
  const stripProgress = (i: number): number => Math.min(1, Math.max(0, (progress - (i / stripCount) * 0.6) / 0.4));

  // 软边宽度（占单条宽度的比例）
  const softRatio = (edgeSoftness / 100) * (1 / stripCount);

  return (
    <AlphaSurface>
      <div style={{position: "absolute", inset: 0, display: "flex", flexDirection: vertical ? "row" : "column"}}>
        {Array.from({length: stripCount}).map((_, i) => {
          const p = stripProgress(i);
          // 展开边缘软边渐变（竖条在右缘，横条在底缘）
          const gradient = vertical
            ? `linear-gradient(90deg, #fff ${100 - softRatio * 100}%, rgba(255,255,255,${Math.max(0, 1 - softRatio * 6)}) ${100}%)`
            : `linear-gradient(180deg, #fff ${100 - softRatio * 100}%, rgba(255,255,255,${Math.max(0, 1 - softRatio * 6)}) ${100}%)`;
          return (
            <div key={i} style={{
              position: "relative",
              width: vertical ? `${100 / stripCount}%` : "100%",
              height: vertical ? "100%" : `${100 / stripCount}%`,
              background: "#fff",
              clipPath: vertical ? `inset(0 ${(1 - p) * 100}% 0 0)` : `inset(0 0 ${(1 - p) * 100}% 0)`,
            }}>
              <div style={{
                position: "absolute",
                ...(vertical ? {top: 0, right: 0, bottom: 0, width: `${softRatio * 100}%`} : {left: 0, right: 0, bottom: 0, height: `${softRatio * 100}%`}),
                background: gradient,
              }} />
            </div>
          );
        })}
      </div>
    </AlphaSurface>
  );
};
