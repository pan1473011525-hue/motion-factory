// 动态相框（宝丽来）：白边相框 + 错位堆叠散开 + 逐张弹入 + 可叠标签
// 形态参考 Codrops Polaroid 概念（只借几何，代码自写）；动效帧驱动确定性。
import type {PolaroidPhotoProps} from "../../templates/polaroid-photo/manifest";
import {AlphaSurface, MediaSlot, SafeArea, ThemeProvider, useCanvasUnit} from "../primitives";
import {Easing, interpolate, useCurrentFrame, useVideoConfig} from "remotion";

const PER_ITEM = 8; // 每张间隔帧（30fps 基准）

export const PolaroidPhoto: React.FC<PolaroidPhotoProps> = (props) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const unit = useCanvasUnit();
  const f = (n: number) => Math.max(1, Math.round((n * fps) / 30));

  const assets = [props.asset1, props.asset2, props.asset3, props.asset4, props.asset5, props.asset6].filter(Boolean);
  const N = assets.length;
  if (N === 0) return null;

  // 宝丽来卡：图 4:3 + 白边 + 底部手写区
  const imgW = Math.min(340 * unit, 1920 * unit * 0.8 / Math.max(1, Math.min(N, 3)));
  const imgH = imgW * 0.75;
  const pad = 18 * unit;
  const cardW = imgW + pad * 2;
  const cardH = imgH + pad * 2 + 52 * unit;

  // 扇形散开：N 张绕中心错位（角度/偏移随索引），堆叠时集中
  const fanAngle = 14; // 总扇角
  const center = (N - 1) / 2;

  return (
    <AlphaSurface>
      <ThemeProvider preset={props.stylePreset} accent={props.accentColor}>
        <SafeArea inset={0.04}>
          <div style={{position: "absolute", inset: 0, display: "flex", flexDirection: "column"}}>
            {props.title && <div style={{fontSize: 46 * unit, fontWeight: 800, color: "#F7F9FB", marginBottom: 20 * unit, letterSpacing: 1}}>{props.title}</div>}
            <div style={{flex: 1, position: "relative"}}>
              {assets.map((assetId, i) => {
                const start = i * f(PER_ITEM);
                const progress = interpolate(frame, [start, start + f(26)], [0, 1], {extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.out(Easing.back(1.3))});
                const appear = interpolate(frame, [start, start + f(10)], [0, 1], {extrapolateLeft: "clamp", extrapolateRight: "clamp"});
                const k = i - center;
                const rot = (fanAngle * k) / Math.max(1, center) * progress;
                const tx = k * (cardW * 0.52) * progress;
                const ty = Math.abs(k) * 24 * unit * progress;
                return (
                  <div key={i} style={{
                    position: "absolute", left: "50%", top: "50%", width: cardW, height: cardH,
                    margin: `${-cardH / 2}px 0 0 ${-cardW / 2}px`,
                    background: "#FDFDFB", borderRadius: 6 * unit, boxSizing: "border-box",
                    padding: pad, boxShadow: "0 16px 40px rgba(0,0,0,0.4)",
                    opacity: appear,
                    transform: `translate(${tx}px, ${ty + (1 - progress) * 60 * unit}px) rotate(${rot}deg)`,
                    zIndex: i,
                  }}>
                    <div style={{width: imgW, height: imgH, overflow: "hidden"}}>
                      <MediaSlot assetId={assetId} radius={0} label={`照片 ${i + 1}`} />
                    </div>
                    {/* 手写区 */}
                    <div style={{
                      height: 52 * unit, display: "flex", alignItems: "center", justifyContent: "center",
                      fontFamily: "Georgia, 'Songti SC', serif", fontStyle: "italic",
                      fontSize: 20 * unit, color: "rgba(60,60,58,0.75)",
                    }}>
                      {props.caption}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </SafeArea>
      </ThemeProvider>
    </AlphaSurface>
  );
};
