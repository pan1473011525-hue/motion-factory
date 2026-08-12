// Adapted from Vincentwei1021/video-shotcraft (c) 2026, Apache License 2.0
// https://github.com/Vincentwei1021/video-shotcraft — demos/ui-entrance/carousel-3d/Carousel3D.tsx
// 改动：卡片装饰内容替换为图片媒体槽；速度/半径/强调色参数化；DesignStage 480×270 改为画布自适应；
// 背景透明（弃用径向渐变夜幕）；时间轴按 30fps 基准帧号换算。
import type {Carousel3dProps} from "../../templates/carousel-3d/manifest";
import {AlphaSurface, ThemeProvider, useCanvasUnit} from "../primitives";
import {PhotoTile} from "../photo-tile";
import {useCurrentFrame, useVideoConfig} from "remotion";

const SPIN_360_FRAMES = 168; // 30fps 基准下一整圈的帧数

export const Carousel3d: React.FC<Carousel3dProps> = (props) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const unit = useCanvasUnit();
  const f = (n: number) => Math.max(1, Math.round((n * fps) / 30));

  const rawAssets = [props.asset1, props.asset2, props.asset3, props.asset4, props.asset5, props.asset6, props.asset7, props.asset8].filter(Boolean);
  const assets = rawAssets.length > 0 ? rawAssets : ["", "", "", ""];
  const N = assets.length;
  if (N === 0) return null;

  // DesignStage 480×270 → 画布缩放
  const scale = 4 * unit;
  const spin = (frame / f(SPIN_360_FRAMES)) * 360 * props.speed;
  const cardW = 92 * scale;
  const cardH = 124 * scale;
  const radius = props.radius * scale;
  const accent = props.accentColor;

  return (
    <AlphaSurface>
      <ThemeProvider preset={props.stylePreset} accent={accent}>
        <div style={{position: "absolute", inset: 0, overflow: "hidden", perspective: "950px"}}>
          {/* 相机固定：浅俯角近景 */}
          <div style={{
            position: "absolute", left: "50%", top: "50%", width: 0, height: 0,
            transformStyle: "preserve-3d", transform: "translateZ(-90px) rotateX(-8deg) translateY(-10px)",
          }}>
            {/* 圆环载体：绕 Y 匀速自转 */}
            <div style={{position: "absolute", transformStyle: "preserve-3d", transform: `rotateY(${spin}deg)`}}>
              {assets.map((assetId, i) => {
                const faceStyle: React.CSSProperties = {
                  position: "absolute", inset: 0, borderRadius: 9 * scale,
                  overflow: "hidden", backfaceVisibility: "hidden", WebkitBackfaceVisibility: "hidden",
                  border: `1px solid ${accent}55`, boxShadow: `0 12px 34px rgba(0,0,0,0.5)`,
                };
                return (
                  <div key={i} style={{
                    position: "absolute", left: -cardW / 2, top: -cardH / 2,
                    width: cardW, height: cardH, transformStyle: "preserve-3d",
                    transform: `rotateY(${(i * 360) / N}deg) translateZ(${radius}px)`,
                  }}>
                    <div style={faceStyle}><PhotoTile assetId={assetId} index={i} label={`图片 ${i + 1}`} /></div>
                    <div style={{...faceStyle, transform: "rotateY(180deg)"}}><PhotoTile assetId={assetId} index={i} label={`图片 ${i + 1}`} /></div>
                  </div>
                );
              })}
            </div>
            {/* 地面反光盘 */}
            <div style={{
              position: "absolute", left: -230 * scale, top: 70 * scale, width: 460 * scale, height: 460 * scale,
              borderRadius: "50%", transform: "rotateX(90deg)",
              background: "radial-gradient(circle, rgba(110,140,255,0.14) 0%, transparent 62%)",
            }} />
          </div>
        </div>
      </ThemeProvider>
    </AlphaSurface>
  );
};
