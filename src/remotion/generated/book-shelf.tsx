// 书封墙：书籍封面网格逐排滑入 + 定格微摆（形态参考 Codrops BookPreview 概念，代码自写）
import type {BookShelfProps} from "../../templates/book-shelf/manifest";
import {AlphaSurface, SafeArea, ThemeProvider, useCanvasUnit} from "../primitives";
import {PhotoTile} from "../photo-tile";
import {Easing, interpolate, useCurrentFrame, useVideoConfig} from "remotion";

const ROW_DELAY = 6; // 排间隔（30fps 基准）
const COL_DELAY = 3;

export const BookShelf: React.FC<BookShelfProps> = (props) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const unit = useCanvasUnit();
  const f = (n: number) => Math.max(1, Math.round((n * fps) / 30));

  const rawAssets = [props.asset1, props.asset2, props.asset3, props.asset4, props.asset5, props.asset6, props.asset7, props.asset8].filter(Boolean);
  const assets = rawAssets.length > 0 ? rawAssets : ["", "", "", ""];
  const N = assets.length;
  if (N === 0) return null;

  const columns = Math.min(props.columns, N);
  const bookW = 190 * unit;
  const bookH = bookW * 1.42;
  const gap = 26 * unit;

  return (
    <AlphaSurface>
      <ThemeProvider preset={props.stylePreset} accent={props.accentColor}>
        <SafeArea inset={0.04}>
          <div style={{position: "absolute", inset: 0, display: "flex", flexDirection: "column"}}>
            {props.title && <div style={{fontSize: 44 * unit, fontWeight: 800, color: "#F7F9FB", marginBottom: 20 * unit}}>{props.title}</div>}
            <div style={{flex: 1, display: "flex", alignItems: "center", justifyContent: "center"}}>
              <div style={{display: "grid", gridTemplateColumns: `repeat(${columns}, ${bookW}px)`, gap}}>
                {assets.map((assetId, i) => {
                  const col = i % columns;
                  const row = Math.floor(i / columns);
                  const start = (row * f(ROW_DELAY) + col * f(COL_DELAY));
                  const progress = interpolate(frame, [start, start + f(30)], [0, 1], {extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.out(Easing.cubic)});
                  const appear = interpolate(frame, [start, start + f(10)], [0, 1], {extrapolateLeft: "clamp", extrapolateRight: "clamp"});
                  // 定格微摆：从 ±3° 摆回 0
                  const swing = interpolate(frame, [start + f(26), start + f(40)], [1, 0], {extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.out(Easing.quad)});
                  const rot = (i % 2 === 0 ? -1 : 1) * 3 * swing;
                  return (
                    <div key={i} style={{
                      width: bookW, height: bookH, position: "relative",
                      opacity: appear,
                      transform: `translateX(${(1 - progress) * 160 * unit}px) rotate(${rot}deg)`,
                    }}>
                      <div style={{width: "100%", height: "100%", overflow: "hidden", borderRadius: 6 * unit, boxShadow: "0 14px 34px rgba(0,0,0,0.4)"}}>
                        <PhotoTile assetId={assetId} index={i} label={`封面 ${i + 1}`} />
                      </div>
                      {/* 书脊高光 */}
                      <div style={{position: "absolute", left: 0, top: 0, bottom: 0, width: 8 * unit, background: "rgba(255,255,255,0.18)"}} />
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </SafeArea>
      </ThemeProvider>
    </AlphaSurface>
  );
};
