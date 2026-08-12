// 文献卡片：引用卡片错位堆叠、逐张浮起，带档案编号与年份标签（形态参考 Codrops StackMotion 概念，代码自写）
import type {DocumentCardProps} from "../../templates/document-card/manifest";
import {AlphaSurface, SafeArea, ThemeProvider, useCanvasUnit} from "../primitives";
import {PhotoTile} from "../photo-tile";
import {Easing, interpolate, useCurrentFrame, useVideoConfig} from "remotion";

const PER_ITEM = 9; // 每张间隔（30fps 基准）

export const DocumentCard: React.FC<DocumentCardProps> = (props) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const unit = useCanvasUnit();
  const f = (n: number) => Math.max(1, Math.round((n * fps) / 30));

  const rawAssets = [props.asset1, props.asset2, props.asset3, props.asset4, props.asset5, props.asset6].filter(Boolean);
  const assets = rawAssets.length > 0 ? rawAssets : ["", "", "", "", ""];
  const N = assets.length;
  if (N === 0) return null;

  const cardW = 300 * unit;
  const cardH = cardW * 1.34;
  const center = (N - 1) / 2;

  return (
    <AlphaSurface>
      <ThemeProvider preset={props.stylePreset} accent={props.accentColor}>
        <SafeArea inset={0.04}>
          <div style={{position: "absolute", inset: 0, display: "flex", flexDirection: "column"}}>
            {props.title && <div style={{fontSize: 44 * unit, fontWeight: 800, color: "#F7F9FB", marginBottom: 20 * unit}}>{props.title}</div>}
            <div style={{flex: 1, position: "relative"}}>
              {assets.map((assetId, i) => {
                const start = i * f(PER_ITEM);
                const progress = interpolate(frame, [start, start + f(30)], [0, 1], {extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.out(Easing.cubic)});
                const appear = interpolate(frame, [start, start + f(12)], [0, 1], {extrapolateLeft: "clamp", extrapolateRight: "clamp"});
                // 错位堆叠（初始集中）→ 逐张浮起散开
                const k = i - center;
                const rot = k * 5 * progress;
                const tx = k * (cardW * 0.42) * progress;
                const ty = (1 - progress) * 40 * unit;
                return (
                  <div key={i} style={{
                    position: "absolute", left: "50%", top: "50%", width: cardW, height: cardH,
                    margin: `${-cardH / 2}px 0 0 ${-cardW / 2}px`,
                    opacity: appear,
                    transform: `translate(${tx}px, ${ty}px) rotate(${rot}deg)`,
                    background: "#FBFAF6", borderRadius: 8 * unit, boxShadow: "0 16px 40px rgba(0,0,0,0.38)",
                    overflow: "hidden", zIndex: i,
                  }}>
                    {/* 档案编号角标 */}
                    <div style={{
                      position: "absolute", left: 0, top: 0, zIndex: 2,
                      padding: `${6 * unit}px ${14 * unit}px`, background: props.accentColor,
                      color: "#1A1A1A", fontSize: 15 * unit, fontWeight: 800, letterSpacing: 1,
                      borderBottomRightRadius: 6 * unit,
                    }}>
                      {String(i + 1).padStart(2, "0")}
                    </div>
                    <div style={{width: "100%", height: cardH - 64 * unit, overflow: "hidden"}}>
                      <PhotoTile assetId={assetId} index={i} label={`文献 ${i + 1}`} />
                    </div>
                    <div style={{height: 64 * unit, display: "flex", alignItems: "center", justifyContent: "space-between", padding: `0 ${18 * unit}px`, boxSizing: "border-box"}}>
                      <span style={{fontSize: 17 * unit, color: "rgba(60,56,50,0.75)", fontFamily: "Georgia, serif", fontStyle: "italic"}}>{props.year}</span>
                      <span style={{fontSize: 15 * unit, color: props.accentColor, letterSpacing: 2, fontWeight: 700}}>REF · {String(i + 1).padStart(2, "0")}</span>
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
