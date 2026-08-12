import type {CSSProperties, ReactNode} from "react";
import {
  AbsoluteFill,
  Easing,
  Sequence,
  interpolate,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import type {
  ComposerComposition as ComposerScene,
  ComposerMotionPresetId,
  ComposerNode,
} from "../../packages/project-model/src";
import {getComposerComponent} from "./registry";
import {getComposerEasingFunction} from "./easing";
import {getRuntimeTemplate} from "../templates/definitions";
import {lottieAssets} from "./lottie-assets";
import {Lottie} from "@remotion/lottie";
import {
  MediaSlot,
  useMotionSettings,
  useProjectFontFamily,
} from "../remotion/primitives";

const asString = (value: unknown, fallback = ""): string => typeof value === "string" ? value : fallback;
const asNumber = (value: unknown, fallback = 0): number => typeof value === "number" && Number.isFinite(value) ? value : fallback;
const asBoolean = (value: unknown, fallback = false): boolean => typeof value === "boolean" ? value : fallback;

const motionSupportsLoop = (preset: ComposerMotionPresetId): boolean =>
  preset === "float" || preset === "pulse" || preset === "drift" || preset === "rotate" || preset === "breathe";

const perceptualScale = (from: number, progress: number): number =>
  Math.sqrt(Math.max(0, from ** 2 + (1 - from ** 2) * progress));

const getRevealStyle = (
  preset: ComposerMotionPresetId,
  progress: number,
  intensity: number,
  unit: number,
): {x: number; y: number; scale: number; opacity: number; blur: number; clipPath?: string} => {
  const distance = 90 * intensity * unit;
  if (preset === "fade") return {x: 0, y: 0, scale: 1, opacity: progress, blur: 0};
  if (preset === "rise") return {x: 0, y: (1 - progress) * distance, scale: 1, opacity: progress, blur: 0};
  if (preset === "drop") return {x: 0, y: -(1 - progress) * distance, scale: 1, opacity: progress, blur: 0};
  if (preset === "slide-left") return {x: -(1 - progress) * distance * 1.5, y: 0, scale: 1, opacity: progress, blur: 0};
  if (preset === "slide-right") return {x: (1 - progress) * distance * 1.5, y: 0, scale: 1, opacity: progress, blur: 0};
  if (preset === "scale") return {x: 0, y: 0, scale: perceptualScale(0.62, progress), opacity: progress, blur: 0};
  if (preset === "pop") return {x: 0, y: 0, scale: perceptualScale(0.72, progress), opacity: Math.min(1, progress * 1.5), blur: 0};
  if (preset === "wipe-left") return {x: 0, y: 0, scale: 1, opacity: 1, blur: 0, clipPath: `inset(0 ${(1 - progress) * 100}% 0 0)`};
  if (preset === "wipe-right") return {x: 0, y: 0, scale: 1, opacity: 1, blur: 0, clipPath: `inset(0 0 0 ${(1 - progress) * 100}%)`};
  if (preset === "blur") return {x: 0, y: 0, scale: 1, opacity: progress, blur: (1 - progress) * 24 * intensity * unit};
  return {x: 0, y: 0, scale: 1, opacity: 1, blur: 0};
};

export const getComposerMotionStyle = (
  node: ComposerNode,
  frame: number,
  fps: number,
  reducedMotion: boolean,
  speed: number,
  unit = 1,
): CSSProperties => {
  const duration = node.timing.durationInFrames;
  const enterFrames = Math.max(1, Math.round(node.motion.enterDuration / speed));
  const exitFrames = Math.max(1, Math.round(node.motion.exitDuration / speed));
  const enterProgress = interpolate(frame, [0, enterFrames], [0, 1], {extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: getComposerEasingFunction(node.motion.enterEasing)});
  const exitProgress = interpolate(frame, [Math.max(0, duration - exitFrames), Math.max(1, duration - 1)], [1, 0], {extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: getComposerEasingFunction(node.motion.exitEasing)});
  const enterPreset = reducedMotion && node.motion.enter !== "none" ? "fade" : node.motion.enter;
  const exitPreset = reducedMotion && node.motion.exit !== "none" ? "fade" : node.motion.exit;
  // mix 权重:各通道效果按 0..1 权重插值(1 还原原行为,0 关闭该通道)。
  const mix = node.motion.mix ?? {enter: 1, exit: 1, loop: 1};
  const weightedEnter = 1 + (enterProgress - 1) * mix.enter;
  const weightedExit = 1 - (1 - exitProgress) * mix.exit;
  const enter = getRevealStyle(enterPreset, weightedEnter, node.motion.intensity, unit);
  const exit = getRevealStyle(exitPreset, weightedExit, node.motion.intensity, unit);
  const seconds = frame / Math.max(1, fps) * speed;
  let loopX = 0;
  let loopY = 0;
  let loopScale = 1;
  let loopRotate = 0;
  let loopOpacity = 1;
  if (!reducedMotion && motionSupportsLoop(node.motion.loop)) {
    const wave = Math.sin(seconds * Math.PI * 2 / 2.4);
    if (node.motion.loop === "float") loopY = wave * 12 * node.motion.intensity * unit * mix.loop;
    if (node.motion.loop === "drift") loopX = wave * 14 * node.motion.intensity * unit * mix.loop;
    if (node.motion.loop === "pulse") loopScale = 1 + wave * 0.025 * node.motion.intensity * mix.loop;
    if (node.motion.loop === "rotate") loopRotate = seconds * 12 * node.motion.intensity * mix.loop;
    if (node.motion.loop === "breathe") loopOpacity = 1 + (0.88 + (wave + 1) * 0.06 - 1) * mix.loop;
  }
  return {
    opacity: node.transform.opacity * enter.opacity * exit.opacity * loopOpacity,
    translate: `${enter.x + exit.x + loopX}px ${enter.y + exit.y + loopY}px`,
    scale: enter.scale * exit.scale * loopScale,
    rotate: `${node.transform.rotation + loopRotate}deg`,
    filter: enter.blur + exit.blur > 0.01 ? `blur(${enter.blur + exit.blur}px)` : undefined,
    clipPath: frame < enterFrames ? enter.clipPath : exit.clipPath,
  };
};

const ComponentContent: React.FC<{node: ComposerNode; unit: number}> = ({node, unit}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const fontFamily = useProjectFontFamily();
  const motion = useMotionSettings();
  const props = getComposerComponent(node.componentId).schema.parse(node.props);
  const contentEasing = getComposerEasingFunction(node.motion.contentEasing);
  const full: CSSProperties = {width: "100%", height: "100%"};
  const alignItems = asString(props.align, "left") === "center" ? "center" : asString(props.align, "left") === "right" ? "flex-end" : "flex-start";

  if (node.componentId === "title" || node.componentId === "body-text") {
    return <div style={{...full, display: "flex", alignItems: "center", justifyContent: alignItems, color: asString(props.color, "#F4F7FB"), fontFamily, fontSize: asNumber(props.fontSize, node.componentId === "title" ? 96 : 42) * unit, fontWeight: asNumber(props.fontWeight, 600), lineHeight: asNumber(props.lineHeight, 1.08), textAlign: asString(props.align, "left") as CSSProperties["textAlign"], whiteSpace: "pre-wrap", overflow: "hidden"}}>{asString(props.text)}</div>;
  }

  if (node.componentId === "stat-number") {
    const duration = Math.max(1, Math.round(0.8 * fps / motion.speed));
    const progress = motion.reducedMotion ? 1 : interpolate(frame, [0, duration], [0, 1], {extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: contentEasing});
    const value = asNumber(props.value) * progress;
    return <div style={{...full, display: "flex", flexDirection: "column", justifyContent: "center", color: asString(props.color, "#47A7FF"), fontFamily}}><div style={{fontSize: 116 * unit, lineHeight: 0.92, fontWeight: 760, fontVariantNumeric: "tabular-nums"}}>{asString(props.prefix)}{value.toFixed(asNumber(props.decimals, 0))}{asString(props.suffix)}</div><div style={{marginTop: 18 * unit, color: "rgba(244,247,251,0.72)", fontSize: 28 * unit, fontWeight: 520}}>{asString(props.label)}</div></div>;
  }

  if (node.componentId === "rectangle") return <div style={{...full, background: asString(props.fill), border: `${asNumber(props.borderWidth)}px solid ${asString(props.borderColor)}`, borderRadius: asNumber(props.radius) * unit}} />;
  if (node.componentId === "ellipse") return <div style={{...full, background: asString(props.fill), border: `${asNumber(props.borderWidth)}px solid ${asString(props.borderColor)}`, borderRadius: "50%"}} />;
  if (node.componentId === "divider") {
    const vertical = asString(props.direction) === "vertical";
    return <div style={{...full, display: "grid", placeItems: "center"}}><div style={{background: asString(props.color), width: vertical ? asNumber(props.thickness) * unit : "100%", height: vertical ? "100%" : asNumber(props.thickness) * unit, borderRadius: 999}} /></div>;
  }

  if (node.componentId === "image" || node.componentId === "video") {
    return <MediaSlot assetId={asString(props.assetId)} fit={asString(props.fit, "cover") as "cover" | "contain" | "fill"} radius={asNumber(props.radius) * unit} playbackRate={asNumber(props.playbackRate, 1)} playbackMode={asBoolean(props.loop, true) ? "loop" : "hold"} trimBeforeFrames={asNumber(props.trimBeforeFrames, 0)} label={node.componentId === "image" ? "选择图片素材" : "选择视频素材"} />;
  }

  if (node.componentId === "quote") return <div style={{...full, display: "flex", flexDirection: "column", justifyContent: "center", color: asString(props.color), fontFamily, borderLeft: `${8 * unit}px solid ${asString(props.accentColor)}`, paddingLeft: 34 * unit}}><div style={{fontSize: 48 * unit, lineHeight: 1.25, fontWeight: 620}}>“{asString(props.quote)}”</div><div style={{marginTop: 26 * unit, fontSize: 27 * unit, fontWeight: 650}}>{asString(props.author)}</div><div style={{marginTop: 6 * unit, color: "rgba(244,247,251,0.62)", fontSize: 22 * unit}}>{asString(props.role)}</div></div>;
  if (node.componentId === "badge") return <div style={{...full, display: "grid", placeItems: "center", color: asString(props.textColor), background: asString(props.backgroundColor), borderRadius: asNumber(props.radius) * unit, fontFamily, fontSize: asNumber(props.fontSize, 34) * unit, fontWeight: 720, overflow: "hidden"}}>{asString(props.text)}</div>;

  if (node.componentId === "progress") {
    const value = Math.min(100, Math.max(0, asNumber(props.value)));
    const progress = motion.reducedMotion ? 1 : interpolate(frame, [0, Math.max(1, fps)], [0, 1], {extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: contentEasing});
    return <div style={{...full, display: "flex", flexDirection: "column", justifyContent: "center", color: "#F4F7FB", fontFamily}}><div style={{display: "flex", justifyContent: "space-between", alignItems: "baseline", fontSize: 28 * unit, fontWeight: 620}}><span>{asString(props.label)}</span>{asBoolean(props.showValue, true) && <strong style={{fontVariantNumeric: "tabular-nums"}}>{Math.round(value * progress)}%</strong>}</div><div style={{height: 18 * unit, marginTop: 18 * unit, borderRadius: 999, background: asString(props.trackColor), overflow: "hidden"}}><div style={{width: `${value * progress}%`, height: "100%", borderRadius: 999, background: asString(props.accentColor)}} /></div></div>;
  }

  if (node.componentId === "callout") return <div style={{...full, display: "flex", flexDirection: "column", justifyContent: "center", padding: 34 * unit, color: asString(props.textColor), background: asString(props.backgroundColor), border: `2px solid ${asString(props.accentColor)}`, borderRadius: asNumber(props.radius) * unit, fontFamily, overflow: "hidden"}}><strong style={{fontSize: 34 * unit, lineHeight: 1.1}}>{asString(props.title)}</strong><span style={{marginTop: 16 * unit, color: "rgba(244,247,251,0.72)", fontSize: 25 * unit, lineHeight: 1.35, whiteSpace: "pre-wrap"}}>{asString(props.body)}</span></div>;
  if (node.componentId === "lower-third") return <div style={{...full, display: "flex", alignItems: "stretch", fontFamily, flexDirection: asString(props.align) === "right" ? "row-reverse" : "row"}}><div style={{width: 12 * unit, background: asString(props.accentColor)}} /><div style={{display: "flex", flex: 1, flexDirection: "column", justifyContent: "center", alignItems, padding: `0 ${30 * unit}px`, color: asString(props.textColor), background: "rgba(14,19,26,0.88)"}}><strong style={{fontSize: 42 * unit, lineHeight: 1.05}}>{asString(props.name)}</strong><span style={{marginTop: 10 * unit, color: "rgba(244,247,251,0.66)", fontSize: 24 * unit}}>{asString(props.role)}</span></div></div>;

  if (node.componentId === "bar-chart") {
    const labels = asString(props.labels).split(",").map((value) => value.trim()).filter(Boolean).slice(0, 12);
    const values = asString(props.values).split(",").map(Number).map((value) => Number.isFinite(value) ? value : 0).slice(0, labels.length);
    const maximum = Math.max(1, ...values);
    const progress = motion.reducedMotion ? 1 : interpolate(frame, [0, Math.max(1, Math.round(fps * 1.1))], [0, 1], {extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: contentEasing});
    return <div style={{...full, display: "flex", flexDirection: "column", color: asString(props.textColor), fontFamily}}><strong style={{fontSize: 32 * unit}}>{asString(props.title)}</strong><div style={{display: "flex", flex: 1, alignItems: "flex-end", gap: 18 * unit, paddingTop: 24 * unit}}>{labels.map((label, index) => {const value = values[index] ?? 0; return <div key={`${label}-${index}`} style={{display: "flex", flex: 1, minWidth: 0, height: "100%", flexDirection: "column", justifyContent: "flex-end", alignItems: "center"}}>{asBoolean(props.showValues, true) && <span style={{fontSize: 20 * unit, fontVariantNumeric: "tabular-nums"}}>{value}</span>}<div style={{width: "70%", height: `${Math.max(2, value / maximum * progress * 80)}%`, marginTop: 8 * unit, borderRadius: `${9 * unit}px ${9 * unit}px 0 0`, background: asString(props.accentColor)}} /><span style={{width: "100%", marginTop: 10 * unit, overflow: "hidden", textAlign: "center", textOverflow: "ellipsis", whiteSpace: "nowrap", color: "rgba(244,247,251,0.68)", fontSize: 18 * unit}}>{label}</span></div>;})}</div></div>;
  }

  if (node.componentId === "list-reveal") {
    const items = asString(props.items).split(",").map((value) => value.trim()).filter(Boolean).slice(0, 12);
    const fontSize = asNumber(props.fontSize, 24) * unit;
    return <div style={{...full, display: "flex", alignItems: "center", justifyContent: "center", fontFamily}}>
      <div style={{width: "100%", height: "100%", display: "flex", flexDirection: "column", justifyContent: "center", gap: fontSize * 0.5}}>
        {items.map((label, index) => {
          const start = Math.round(index * fps * 0.12);
          const progress = motion.reducedMotion ? 1 : interpolate(frame, [start, start + Math.max(1, Math.round(fps * 0.3))], [0, 1], {extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: contentEasing});
          const p = Easing.out(Easing.back(1.2))(progress);
          return <div key={`${label}-${index}`} style={{display: "flex", alignItems: "center", gap: fontSize * 0.6, opacity: Math.min(1, progress * 2), transform: `scale(${0.7 + p * 0.3}) translateY(${(1 - progress) * fontSize}px)`}}>
            <div style={{width: fontSize * 0.8, height: fontSize * 0.8, borderRadius: fontSize * 0.25, flex: "none", background: asString(props.accentColor, "#47A7FF")}} />
            <span style={{fontSize, fontWeight: 500, color: asString(props.textColor, "#F4F7FB"), whiteSpace: "nowrap"}}>{label}</span>
          </div>;
        })}
      </div>
    </div>;
  }

  if (node.componentId === "card-stack") {
    const count = Math.max(4, Math.min(12, asNumber(props.count, 8)));
    const cardW = 110 * unit;
    const cardH = 150 * unit;
    return <div style={{...full, position: "relative", perspective: 900}}>
      {Array.from({length: count}).map((_, index) => {
        const k = index - (count - 1) / 2;
        const fan = motion.reducedMotion ? 1 : interpolate(frame, [Math.max(0, Math.round(fps * 0.5)), Math.round(fps * 1.4)], [0, 1], {extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: contentEasing});
        const inStart = Math.round(index * fps * 0.08);
        const inProgress = motion.reducedMotion ? 1 : interpolate(frame, [inStart, inStart + Math.round(fps * 0.35)], [0, 1], {extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.out(Easing.cubic)});
        const rot = k * 8 * fan;
        const tx = k * 34 * fan;
        return <div key={index} style={{position: "absolute", left: "50%", top: "50%", width: cardW, height: cardH, margin: `${-cardH / 2}px 0 0 ${-cardW / 2}px`, borderRadius: 12 * unit, background: asString(props.accentColor, "#47A7FF"), opacity: Math.min(1, inProgress * 2), transform: `translate3d(${tx}px,${(1 - inProgress) * 90}px,0) rotate(${rot}deg)`, boxShadow: "0 12px 34px rgba(0,0,0,0.5)", zIndex: 20 - Math.abs(k * 2)}} />;
      })}
    </div>;
  }

  if (node.componentId === "skeleton-reveal") {
    const lines = asString(props.lines).split(",").map((value) => value.trim()).filter(Boolean).slice(0, 6);
    return <div style={{...full, display: "flex", flexDirection: "column", justifyContent: "center", gap: 18 * unit, fontFamily}}>
      <div style={{display: "flex", gap: 18 * unit, alignItems: "center"}}>
        <div style={{width: 56 * unit, height: 56 * unit, borderRadius: 14 * unit, background: asString(props.accentColor, "#47A7FF"), opacity: 0.85}} />
        <div style={{height: 22 * unit, width: "55%", borderRadius: 11 * unit, background: "rgba(255,255,255,0.28)"}} />
      </div>
      {lines.map((line, index) => {
        const progress = motion.reducedMotion ? 1 : interpolate(frame, [Math.round(fps * (0.4 + index * 0.2)), Math.round(fps * (0.7 + index * 0.2))], [0, 1], {extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: contentEasing});
        return <div key={`${line}-${index}`} style={{opacity: progress, transform: `translateY(${(1 - progress) * 12 * unit}px)`}}>
          {progress < 0.85
            ? <div style={{height: 20 * unit, width: `${88 - index * 12}%`, borderRadius: 10 * unit, background: "rgba(255,255,255,0.2)"}} />
            : <span style={{fontSize: 24 * unit, color: asString(props.textColor, "#F4F7FB")}}>{line}</span>}
        </div>;
      })}
    </div>;
  }

  if (node.componentId === "svg-trace") {
    const trace = motion.reducedMotion ? 1 : interpolate(frame, [0, Math.max(1, Math.round(fps * 0.9))], [0, 1], {extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.inOut(Easing.cubic)});
    const contentOp = motion.reducedMotion ? 1 : interpolate(frame, [Math.round(fps * 0.9), Math.round(fps * 1.1)], [0, 1], {extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.out(Easing.quad)});
    const titleSize = asNumber(props.fontSize, 30) * unit;
    return <div style={{...full, position: "relative", fontFamily}}>
      <svg viewBox="0 0 100 100" preserveAspectRatio="none" style={{position: "absolute", inset: 0, overflow: "visible"}}>
        <rect x={1.5} y={1.5} width={97} height={97} rx={3} fill="none" stroke={asString(props.accentColor, "#F7F9FB")} strokeWidth={0.6} pathLength={1} strokeDasharray="1" strokeDashoffset={1 - trace} strokeLinecap="round" />
      </svg>
      <div style={{position: "absolute", inset: `${7 * unit}px`, display: "flex", flexDirection: "column", justifyContent: "center", opacity: contentOp, padding: `0 ${10 * unit}px`}}>
        <div style={{fontSize: titleSize, fontWeight: 800, color: asString(props.textColor, "#F4F7FB"), lineHeight: 1.15}}>{asString(props.title)}</div>
        <div style={{marginTop: 12 * unit, fontSize: titleSize * 0.55, color: "rgba(244,247,251,0.7)", lineHeight: 1.35}}>{asString(props.subtitle)}</div>
      </div>
    </div>;
  }

  if (node.componentId === "odometer-roll") {
    const fontSize = 88 * unit;
    const ROW = fontSize * 1.08;
    const DW = fontSize * 0.68;
    const ink = asString(props.color, "#F4F7FB");
    const value = asNumber(props.value, 0);
    const intDigits = String(Math.floor(value)).split("").map(Number);
    const posAt = (f: number, d: number, s: number): number => {
      const p0 = 0.85 * s;
      const T = Math.ceil((p0 + 6 - d) / 10) * 10 + d;
      if (f < s) return 0.85 * Math.max(f, 0);
      if (f < s + 16) return interpolate(f, [s, s + 16], [p0, T + 0.5], {extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.out(Easing.cubic)});
      if (f < s + 22) return interpolate(f, [s + 16, s + 22], [T + 0.5, T], {extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.out(Easing.cubic)});
      return T;
    };
    const reel = (digit: number, index: number) => {
      const s = Math.round(fps * (20 + index * 7) / 30);
      const pos = posAt(frame, digit, s);
      return <div style={{position: "relative", width: DW, height: ROW, overflow: "hidden"}}>
        <div style={{position: "absolute", left: 0, top: 0, width: DW, transform: `translateY(${-(pos % 10) * ROW}px)`}}>
          {Array.from({length: 20}).map((_, k) => <div key={k} style={{width: DW, height: ROW, lineHeight: `${ROW}px`, textAlign: "center", fontSize, fontWeight: 800, fontVariantNumeric: "tabular-nums", color: ink}}>{k % 10}</div>)}
        </div>
      </div>;
    };
    const glyph = (ch: string) => <div style={{width: DW, height: ROW, lineHeight: `${ROW}px`, textAlign: "center", fontSize, fontWeight: 800, fontVariantNumeric: "tabular-nums", color: ink}}>{ch}</div>;
    const totalW = (intDigits.length + asString(props.suffix).length) * DW;
    return <div style={{...full, display: "flex", alignItems: "center", justifyContent: "center", fontFamily}}>
      <div style={{display: "flex", width: totalW}}>
        {intDigits.map((d, i) => <div key={i} style={{flex: 1}}>{reel(d, i)}</div>)}
        {asString(props.suffix).split("").map((ch, i) => <div key={`s${i}`} style={{flex: 1}}>{glyph(ch)}</div>)}
      </div>
    </div>;
  }

  if (node.componentId === "lottie") {
    const asset = lottieAssets.find((candidate) => candidate.id === asString(props.assetId)) ?? lottieAssets[0];
    return (
      <div style={{...full, display: "flex", alignItems: "center", justifyContent: "center"}}>
        <Lottie animationData={asset.data} loop={asBoolean(props.loop, true)} style={{width: "100%", height: "100%"}} />
      </div>
    );
  }

  if (node.componentId === "vintage-filter") {
    const intensity = asNumber(props.intensity, 70) / 100;
    return (
      <div style={{...full, position: "relative", pointerEvents: "none", overflow: "hidden"}}>
        {/* 泛黄 tint */}
        <div style={{position: "absolute", inset: 0, background: `rgba(139,107,74,${0.16 * intensity})`, mixBlendMode: "multiply"}} />
        {/* 纸纹 */}
        <div style={{position: "absolute", inset: 0, opacity: 0.4 * intensity, background: "linear-gradient(160deg, rgba(255,245,225,0.5) 0%, rgba(230,215,185,0.3) 60%, rgba(210,190,150,0.4) 100%)", mixBlendMode: "soft-light"}} />
        {/* 颗粒 */}
        <div style={{position: "absolute", inset: 0, opacity: 0.25 * intensity, backgroundImage: "radial-gradient(rgba(60,50,40,0.55) 0.5px, transparent 0.6px)", backgroundSize: "4px 4px"}} />
        {/* 印章 */}
        {asBoolean(props.showStamp, true) && (
          <div style={{
            position: "absolute", right: "6%", bottom: "6%", width: 96 * unit, height: 96 * unit,
            borderRadius: "50%", border: `${3 * unit}px solid rgba(139,107,74,0.65)`, opacity: 0.75,
            display: "flex", alignItems: "center", justifyContent: "center",
            transform: "rotate(-12deg)", color: "rgba(139,107,74,0.75)", fontSize: 18 * unit, fontWeight: 800, letterSpacing: 2,
          }}>
            {asString(props.stampText, "归档")}
          </div>
        )}
      </div>
    );
  }

  if (node.componentId === "template") {
    const definition = getRuntimeTemplate(asString(props.templateId, "stat-counter"));
    const Template = definition.component;
    const parsed = definition.schema.parse(props.templateProps);
    return <Template {...parsed} />;
  }

  return null;
};

const ComposerNodeLayer: React.FC<{node: ComposerNode}> = ({node}) => {
  const frame = useCurrentFrame();
  const {fps, width, height} = useVideoConfig();
  const motion = useMotionSettings();
  const unit = Math.min(width / 1920, height / 1080);
  const style = getComposerMotionStyle(node, frame, fps, motion.reducedMotion, motion.speed, unit);
  const nodeWidth = Math.max(1, Math.round(node.transform.width * width));
  const nodeHeight = Math.max(1, Math.round(node.transform.height * height));
  return <div style={{position: "absolute", left: `${node.transform.x * 100}%`, top: `${node.transform.y * 100}%`, width: `${node.transform.width * 100}%`, height: `${node.transform.height * 100}%`, transformOrigin: `${node.transform.anchorX * 100}% ${node.transform.anchorY * 100}%`, zIndex: node.transform.zIndex, ...style}}><Sequence width={nodeWidth} height={nodeHeight} durationInFrames={node.timing.durationInFrames}><ComponentContent node={node} unit={unit} /></Sequence></div>;
};

export const ComposerComposition: React.FC<{composition: ComposerScene}> = ({composition}) => {
  const children: ReactNode[] = [...composition.nodes]
    .filter((node) => !node.hidden)
    .sort((a, b) => a.transform.zIndex - b.transform.zIndex)
    .map((node) => <Sequence key={node.id} name={node.name} from={node.timing.from} durationInFrames={node.timing.durationInFrames} layout="none"><ComposerNodeLayer node={node} /></Sequence>);
  return <AbsoluteFill style={{backgroundColor: composition.backgroundColor, overflow: "hidden"}}>{children}</AbsoluteFill>;
};
