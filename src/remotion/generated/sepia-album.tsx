// 老照片相册：sepia 滤镜 + 颗粒 + 印章水印 + 纸纹底，照片错峰淡入堆叠（自写）
import type {SepiaAlbumProps} from "../../templates/sepia-album/manifest";
import {AlphaSurface, SafeArea, ThemeProvider, useCanvasUnit} from "../primitives";
import {PhotoTile} from "../photo-tile";
import {Easing, interpolate, useCurrentFrame, useVideoConfig} from "remotion";

const PER_ITEM = 8; // 每张间隔（30fps 基准）

export const SepiaAlbum: React.FC<SepiaAlbumProps> = (props) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const unit = useCanvasUnit();
  const f = (n: number) => Math.max(1, Math.round((n * fps) / 30));

  const rawAssets = [props.asset1, props.asset2, props.asset3, props.asset4, props.asset5, props.asset6].filter(Boolean);
  const assets = rawAssets.length > 0 ? rawAssets : ["", "", "", "", ""];
  const N = assets.length;
  if (N === 0) return null;

  const imgW = Math.min(360 * unit, 1920 * unit * 0.72 / Math.max(1, Math.min(N, 3)));
  const imgH = imgW * 0.78;
  const center = (N - 1) / 2;

  return (
    <AlphaSurface>
      <ThemeProvider preset={props.stylePreset} accent={props.accentColor}>
        {/* 纸纹底 */}
        <div style={{position: "absolute", inset: 0, background: "linear-gradient(160deg, #EFE6D3 0%, #E4D5B8 60%, #D9C7A6 100%)"}} />
        <SafeArea inset={0.05}>
          <div style={{position: "absolute", inset: 0, display: "flex", flexDirection: "column"}}>
            {props.title && <div style={{fontSize: 44 * unit, fontWeight: 800, color: "rgba(70,56,40,0.9)", marginBottom: 18 * unit, fontFamily: "Georgia, serif"}}>{props.title}</div>}
            <div style={{flex: 1, position: "relative"}}>
              {assets.map((assetId, i) => {
                const start = i * f(PER_ITEM);
                const progress = interpolate(frame, [start, start + f(28)], [0, 1], {extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.out(Easing.cubic)});
                const k = i - center;
                const rot = k * 6 * progress;
                const tx = k * (imgW * 0.5) * progress;
                const ty = (1 - progress) * 50 * unit;
                return (
                  <div key={i} style={{
                    position: "absolute", left: "50%", top: "50%", width: imgW, height: imgH,
                    margin: `${-imgH / 2}px 0 0 ${-imgW / 2}px`,
                    opacity: progress,
                    transform: `translate(${tx}px, ${ty}px) rotate(${rot}deg)`,
                    boxShadow: "0 14px 34px rgba(70,56,40,0.35)",
                    zIndex: i,
                  }}>
                    <div style={{width: "100%", height: "100%", overflow: "hidden", filter: "sepia(0.62) contrast(1.06) saturate(0.9)"}}>
                      <PhotoTile assetId={assetId} index={i} label={`照片 ${i + 1}`} />
                    </div>
                    {/* 颗粒 */}
                    <div style={{position: "absolute", inset: 0, opacity: 0.22, backgroundImage: "radial-gradient(rgba(60,50,40,0.5) 0.5px, transparent 0.6px)", backgroundSize: "4px 4px"}} />
                    {/* 印章水印 */}
                    <div style={{
                      position: "absolute", right: -14 * unit, bottom: -10 * unit, width: 88 * unit, height: 88 * unit,
                      borderRadius: "50%", border: `${3 * unit}px solid ${props.accentColor}`, opacity: 0.7,
                      display: "flex", alignItems: "center", justifyContent: "center",
                      transform: "rotate(-12deg)", color: props.accentColor, fontSize: 17 * unit, fontWeight: 800, letterSpacing: 2,
                    }}>
                      {props.stampText}
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
