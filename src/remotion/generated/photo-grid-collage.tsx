// 九宫格拼贴：网格布局 + 逐张错峰弹入（scale + 微旋转 + 浮起）
// 布局为手写规则网格；动效帧驱动确定性（rotate 方向按序号奇偶，动画按 30fps 基准帧号换算）。
import type {PhotoGridCollageProps} from "../../templates/photo-grid-collage/manifest";
import {AlphaSurface, MediaSlot, SafeArea, ThemeProvider, useCanvasUnit} from "../primitives";
import {Easing, interpolate, useCurrentFrame, useVideoConfig} from "remotion";

const PER_ITEM = 10; // 每张间隔

export const PhotoGridCollage: React.FC<PhotoGridCollageProps> = (props) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const unit = useCanvasUnit();
  const f = (n: number) => Math.max(1, Math.round((n * fps) / 30));

  const assets = [props.asset1, props.asset2, props.asset3, props.asset4, props.asset5, props.asset6, props.asset7, props.asset8, props.asset9].filter(Boolean);
  const columns = Math.min(props.columns, Math.max(1, assets.length));
  const rows = Math.max(1, Math.ceil(assets.length / columns));
  const gap = props.gap * unit;
  const radius = props.radius * unit;

  return (
    <AlphaSurface>
      <ThemeProvider preset={props.stylePreset} accent={props.accentColor}>
        <SafeArea inset={0.03}>
          <div style={{position: "absolute", inset: 0, display: "flex", flexDirection: "column"}}>
            {props.title && (
              <div style={{fontSize: 44 * unit, fontWeight: 800, color: "#F7F9FB", marginBottom: 22 * unit, letterSpacing: 1}}>{props.title}</div>
            )}
            <div style={{flex: 1, minHeight: 0, display: "grid", gridTemplateColumns: `repeat(${columns}, 1fr)`, gridTemplateRows: `repeat(${rows}, 1fr)`, gap}}>
              {assets.map((assetId, index) => {
                // 错峰弹入：scale 0.82→1 + rotate ±4°→0 + 浮起
                const start = index * f(PER_ITEM);
                const progress = interpolate(frame, [start, start + f(24)], [0, 1], {extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.out(Easing.back(1.4))});
                const appear = interpolate(frame, [start, start + f(10)], [0, 1], {extrapolateLeft: "clamp", extrapolateRight: "clamp"});
                const rotate = (index % 2 === 0 ? -1 : 1) * 4 * (1 - progress);
                return (
                  <div key={index} style={{
                    minHeight: 0, minWidth: 0, position: "relative", overflow: "hidden", borderRadius: radius,
                    opacity: appear,
                    transform: `scale(${0.82 + progress * 0.18}) rotate(${rotate}deg) translateY(${(1 - appear) * 40 * unit}px)`,
                    boxShadow: "0 8px 24px rgba(0,0,0,0.35)",
                  }}>
                    <MediaSlot assetId={assetId} radius={0} label={`图片 ${index + 1}`} />
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
