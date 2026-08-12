// Adapted from Vincentwei1021/video-shotcraft (c) 2026, Apache License 2.0
// https://github.com/Vincentwei1021/video-shotcraft — demos/effects/light-play-moves/SpotlightSweepReveal.tsx
// 改动：文字替换为图片媒体槽（单张居中或 1-3 张横排）；背景透明（弃用暗色底，图片自持暗调可选）；
// 时间轴按 30fps 基准帧号换算；坐标系画布自适应。聚光扫动/提亮定格逻辑保留。
import type {SpotlightPhotoProps} from "../../templates/spotlight-photo/manifest";
import {AlphaSurface, MediaSlot, ThemeProvider, useCanvasUnit} from "../primitives";
import {Easing, interpolate, useCurrentFrame, useVideoConfig} from "remotion";

const SWEEP_END = 110; // 两个来回结束（30fps 基准）
const REVEAL_END = 125; // 提亮完成
const PERIOD = 55; // 单个来回帧数
const AMP_RATIO = 0.29; // 摆动幅度（占画布宽比例）

export const SpotlightPhoto: React.FC<SpotlightPhotoProps> = (props) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const unit = useCanvasUnit();
  const f = (n: number) => Math.max(1, Math.round((n * fps) / 30));

  const assets = [props.asset1, props.asset2, props.asset3].filter(Boolean);
  const W = 1920 * unit;
  const H = 1080 * unit;
  const CX = W / 2;
  const CY = H / 2;
  const AMP = W * AMP_RATIO;

  // 光斑 x：sin 摆动，两个来回后停在中心
  const sweepF = Math.min(frame, f(SWEEP_END));
  const x = CX + AMP * Math.sin((2 * Math.PI * sweepF) / f(PERIOD));
  const brighten = interpolate(frame, [f(SWEEP_END), f(REVEAL_END)], [0, 1], {extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.out(Easing.cubic)});
  const fadeOut = interpolate(frame, [f(SWEEP_END), f(REVEAL_END)], [1, 0], {extrapolateLeft: "clamp", extrapolateRight: "clamp"});
  const sweepAlive = frame < f(REVEAL_END);

  const maskGrad = `radial-gradient(circle ${380 * unit}px at ${x}px ${CY}px, rgba(0,0,0,1) 0%, rgba(0,0,0,0.95) 45%, rgba(0,0,0,0) 100%)`;
  const imgW = Math.min(W * 0.6, (assets.length > 1 ? 560 : 760) * unit);
  const imgH = imgW * 0.72;

  const PhotoRow: React.FC<{opacity: number}> = ({opacity}) => (
    <div style={{position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", gap: 36 * unit, opacity}}>
      {assets.map((assetId, i) => (
        <div key={i} style={{width: imgW, height: imgH, overflow: "hidden", borderRadius: 16 * unit, boxShadow: "0 14px 40px rgba(0,0,0,0.45)"}}>
          <MediaSlot assetId={assetId} radius={0} label={`图片 ${i + 1}`} />
        </div>
      ))}
    </div>
  );

  return (
    <AlphaSurface>
      <ThemeProvider preset={props.stylePreset} accent={props.accentColor}>
        {/* 暗版图片常驻 */}
        <PhotoRow opacity={0.1} />
        {sweepAlive && (
          <>
            {/* 光锥 */}
            <div style={{
              position: "absolute", inset: 0, opacity: fadeOut,
              clipPath: `polygon(${CX - 70 * unit}px -40px, ${CX + 70 * unit}px -40px, ${x + 420 * unit}px ${CY + 230 * unit}px, ${x - 420 * unit}px ${CY + 230 * unit}px)`,
              background: "linear-gradient(to bottom, rgba(245,245,243,0.16), rgba(245,245,243,0.03) 85%, rgba(245,245,243,0) 100%)",
            }} />
            {/* 柔光斑 */}
            <div style={{
              position: "absolute", inset: 0, opacity: fadeOut,
              background: `radial-gradient(circle ${460 * unit}px at ${x}px ${CY}px, rgba(245,245,243,0.22) 0%, rgba(245,245,243,0.08) 55%, rgba(245,245,243,0) 100%)`,
            }} />
            {/* 亮版图片，按帧移动的 radial mask */}
            <div style={{position: "absolute", inset: 0, WebkitMaskImage: maskGrad, maskImage: maskGrad}}>
              <PhotoRow opacity={1} />
            </div>
          </>
        )}
        {/* 提亮定格层 */}
        <div style={{position: "absolute", inset: 0, opacity: brighten}}>
          <PhotoRow opacity={1} />
        </div>
        {props.title && (
          <div style={{position: "absolute", top: H * 0.08, width: "100%", textAlign: "center", fontSize: 64 * unit, fontWeight: 800, color: "#F7F9FB", letterSpacing: 4 * unit}}>
            {props.title}
          </div>
        )}
      </ThemeProvider>
    </AlphaSurface>
  );
};
