// 档案堆叠：纸张白边卡从中心克制散开成网格（形态参考 Codrops ImageStackGrid 概念，代码自写）
import type {ArchiveStackProps} from "../../templates/archive-stack/manifest";
import {AlphaSurface, SafeArea, ThemeProvider, useCanvasUnit} from "../primitives";
import {PhotoTile} from "../photo-tile";
import {Easing, interpolate, useCurrentFrame, useVideoConfig} from "remotion";

const PER_ITEM = 7; // 每张间隔（30fps 基准）
const COLS = 2;

export const ArchiveStack: React.FC<ArchiveStackProps> = (props) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const unit = useCanvasUnit();
  const f = (n: number) => Math.max(1, Math.round((n * fps) / 30));

  const rawAssets = [props.asset1, props.asset2, props.asset3, props.asset4, props.asset5, props.asset6].filter(Boolean);
  const assets = rawAssets.length > 0 ? rawAssets : ["", "", "", "", ""];
  const N = assets.length;
  if (N === 0) return null;

  const cardW = 320 * unit;
  const cardH = cardW * 1.28;
  const rows = Math.ceil(N / COLS);
  const gapX = 40 * unit;
  const gapY = 36 * unit;
  const gridW = COLS * cardW + (COLS - 1) * gapX;
  const gridH = rows * cardH + (rows - 1) * gapY;

  return (
    <AlphaSurface>
      <ThemeProvider preset={props.stylePreset} accent={props.accentColor}>
        <SafeArea inset={0.04}>
          <div style={{position: "absolute", inset: 0, display: "flex", flexDirection: "column"}}>
            {props.title && <div style={{fontSize: 44 * unit, fontWeight: 800, color: "#F7F9FB", marginBottom: 20 * unit}}>{props.title}</div>}
            <div style={{flex: 1, position: "relative", display: "flex", alignItems: "center", justifyContent: "center"}}>
              {assets.map((assetId, i) => {
                const col = i % COLS;
                const row = Math.floor(i / COLS);
                const start = i * f(PER_ITEM);
                const progress = interpolate(frame, [start, start + f(30)], [0, 1], {extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.out(Easing.cubic)});
                const appear = interpolate(frame, [start, start + f(12)], [0, 1], {extrapolateLeft: "clamp", extrapolateRight: "clamp"});
                // 从中心散开：目标网格位 - 中心偏移
                const targetX = col * (cardW + gapX) - gridW / 2 + cardW / 2;
                const targetY = row * (cardH + gapY) - gridH / 2 + cardH / 2;
                const rot = (i % 2 === 0 ? -1 : 1) * 2.2 * (1 - progress);
                return (
                  <div key={i} style={{
                    position: "absolute", left: "50%", top: "50%", width: cardW, height: cardH,
                    margin: `${-cardH / 2}px 0 0 ${-cardW / 2}px`,
                    opacity: appear,
                    transform: `translate(${targetX * progress}px, ${targetY * progress}px) rotate(${rot}deg)`,
                    background: "#F7F5F0", borderRadius: 4 * unit, boxShadow: "0 12px 30px rgba(0,0,0,0.35)",
                    overflow: "hidden", zIndex: i,
                  }}>
                    <div style={{width: "100%", height: cardH - 46 * unit, overflow: "hidden"}}>
                      <PhotoTile assetId={assetId} index={i} label={`资料 ${i + 1}`} />
                    </div>
                    <div style={{height: 46 * unit, display: "flex", alignItems: "center", justifyContent: "space-between", padding: `0 ${14 * unit}px`, boxSizing: "border-box"}}>
                      <span style={{fontSize: 16 * unit, color: "rgba(70,64,56,0.6)", fontFamily: "Georgia, serif"}}>档案 · {String(i + 1).padStart(2, "0")}</span>
                      <span style={{fontSize: 16 * unit, color: props.accentColor, fontWeight: 700}}>▤</span>
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
