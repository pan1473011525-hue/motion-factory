// 卡片横流：computeRowsLayout 等宽行 + 卡片从左向右依次滑入
// 布局使用按序号分配的比例模式，MediaSlot cover 裁切填充。
import type {PhotoRowStripProps} from "../../templates/photo-row-strip/manifest";
import {AlphaSurface, SafeArea, ThemeProvider, useCanvasUnit} from "../primitives";
import {PhotoTile} from "../photo-tile";
import {computeRowsLayout} from "react-photo-album";
import {Easing, interpolate, useCurrentFrame, useVideoConfig} from "remotion";

const PER_ITEM = 8;

const ratioFor = (index: number): {width: number; height: number} => {
  const mode = index % 3;
  return mode === 0 ? {width: 4, height: 3} : mode === 1 ? {width: 1, height: 1} : {width: 3, height: 4};
};

export const PhotoRowStrip: React.FC<PhotoRowStripProps> = (props) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const unit = useCanvasUnit();
  const f = (n: number) => Math.max(1, Math.round((n * fps) / 30));

  const rawAssets = [props.asset1, props.asset2, props.asset3, props.asset4, props.asset5, props.asset6, props.asset7, props.asset8].filter(Boolean);
  const assets = rawAssets.length > 0 ? rawAssets : ["", "", "", "", ""];
  const gap = props.gap * unit;
  const radius = props.radius * unit;
  const containerWidth = 1920 * unit * 0.94;

  const photos = assets.map((src, index) => ({src, ...ratioFor(index)}));
  const model = computeRowsLayout(photos, gap, 0, containerWidth, props.targetRowHeight * unit);
  if (!model) return null;

  return (
    <AlphaSurface>
      <ThemeProvider preset={props.stylePreset} accent={props.accentColor}>
        <SafeArea inset={0.03}>
          <div style={{position: "absolute", inset: 0, display: "flex", flexDirection: "column"}}>
            {props.title && <div style={{fontSize: 44 * unit, fontWeight: 800, color: "#F7F9FB", marginBottom: 22 * unit, letterSpacing: 1}}>{props.title}</div>}
            <div style={{flex: 1, minHeight: 0, display: "flex", flexDirection: "column", justifyContent: "center", gap: gap}}>
              {model.tracks.map((row, rowIndex) => (
                <div key={rowIndex} style={{display: "flex", gap}}>
                  {row.photos.map((item) => {
                    const start = item.index * f(PER_ITEM);
                    const progress = interpolate(frame, [start, start + f(28)], [0, 1], {extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.out(Easing.cubic)});
                    const appear = interpolate(frame, [start, start + f(10)], [0, 1], {extrapolateLeft: "clamp", extrapolateRight: "clamp"});
                    return (
                      <div key={item.index} style={{
                        width: item.width, height: item.height, flex: "none",
                        opacity: appear,
                        transform: `translateX(${(1 - progress) * 120 * unit}px)`,
                      }}>
                        <div style={{width: "100%", height: "100%", overflow: "hidden", borderRadius: radius, boxShadow: "0 8px 22px rgba(0,0,0,0.3)"}}>
                          <PhotoTile assetId={item.photo.src} index={item.index} label={`图片 ${item.index + 1}`} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
          </div>
        </SafeArea>
      </ThemeProvider>
    </AlphaSurface>
  );
};
