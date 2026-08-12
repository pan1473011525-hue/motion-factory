// 瀑布流：computeMasonryLayout 布局 + 整墙缓滚 + 逐张浮起
// 布局使用按序号分配的比例模式（无真实尺寸时提供错落感），MediaSlot cover 裁切填充。
import type {PhotoMasonryProps} from "../../templates/photo-masonry/manifest";
import {AlphaSurface, SafeArea, ThemeProvider, useCanvasUnit} from "../primitives";
import {PhotoTile} from "../photo-tile";
import {computeMasonryLayout} from "react-photo-album";
import {Easing, interpolate, useCurrentFrame, useVideoConfig} from "remotion";

const ANIM = 110; // 全部浮起完成帧（30fps 基准）
const PER_ITEM = 9;
const SCROLL_RATIO = 0.12; // 整墙滚动幅度（占墙高比例）

// 按序号分配的比例模式（3:4 / 4:3 / 1:1 交替）
const ratioFor = (index: number): {width: number; height: number} => {
  const mode = index % 3;
  return mode === 0 ? {width: 3, height: 4} : mode === 1 ? {width: 4, height: 3} : {width: 1, height: 1};
};

export const PhotoMasonry: React.FC<PhotoMasonryProps> = (props) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const unit = useCanvasUnit();
  const f = (n: number) => Math.max(1, Math.round((n * fps) / 30));

  const rawAssets = [props.asset1, props.asset2, props.asset3, props.asset4, props.asset5, props.asset6, props.asset7, props.asset8, props.asset9].filter(Boolean);
  const assets = rawAssets.length > 0 ? rawAssets : ["", "", "", "", "", ""];
  const gap = props.gap * unit;
  const radius = props.radius * unit;
  const containerWidth = 1920 * unit * 0.94;

  // 布局（photos 假比例）
  const photos = assets.map((src, index) => ({src, ...ratioFor(index)}));
  const model = computeMasonryLayout(photos, gap, 0, containerWidth, Math.min(props.columns, Math.max(1, assets.length)));
  if (!model) return null;

  // 计算每张图的 x/y
  const columnsCount = Number(model.variables?.columns) || Math.min(props.columns, Math.max(1, assets.length));
  const colWidth = containerWidth / columnsCount;
  const placed: Array<{src: string; x: number; y: number; w: number; h: number; index: number}> = [];
  const colY = new Array<number>(columnsCount).fill(0);
  model.tracks.forEach((column, colIndex) => {
    for (const item of column.photos) {
      const w = typeof item.width === "number" ? item.width : colWidth;
      const h = typeof item.height === "number" ? item.height : colWidth;
      placed.push({src: item.photo.src, x: colIndex * colWidth, y: colY[colIndex], w, h, index: item.index});
      colY[colIndex] += h + gap;
    }
  });
  const wallHeight = Math.max(...colY);

  // 整墙缓滚 + 逐张浮起
  const scroll = interpolate(frame, [0, f(ANIM + 40)], [0, wallHeight * SCROLL_RATIO], {extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.inOut(Easing.cubic)});

  return (
    <AlphaSurface>
      <ThemeProvider preset={props.stylePreset} accent={props.accentColor}>
        <SafeArea inset={0.03}>
          <div style={{position: "absolute", inset: 0, display: "flex", flexDirection: "column"}}>
            {props.title && <div style={{fontSize: 44 * unit, fontWeight: 800, color: "#F7F9FB", marginBottom: 22 * unit, letterSpacing: 1}}>{props.title}</div>}
            <div style={{flex: 1, minHeight: 0, position: "relative", overflow: "hidden", transform: `translateY(${-scroll}px)`}}>
              {placed.map((item) => {
                const start = item.index * f(PER_ITEM);
                const progress = interpolate(frame, [start, start + f(26)], [0, 1], {extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.out(Easing.cubic)});
                const appear = interpolate(frame, [start, start + f(12)], [0, 1], {extrapolateLeft: "clamp", extrapolateRight: "clamp"});
                return (
                  <div key={item.index} style={{
                    position: "absolute", left: item.x, top: item.y, width: item.w, height: item.h,
                    opacity: appear,
                    transform: `translateY(${(1 - progress) * 60 * unit}px)`,
                  }}>
                    <div style={{width: "100%", height: "100%", overflow: "hidden", borderRadius: radius, boxShadow: "0 6px 18px rgba(0,0,0,0.3)"}}>
                      <PhotoTile assetId={item.src} index={item.index} label={`图片 ${item.index + 1}`} />
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
