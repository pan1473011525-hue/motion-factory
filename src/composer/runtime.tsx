import type {CSSProperties, ReactNode} from "react";
import {
  AbsoluteFill,
  Easing,
  Sequence,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import type {
  ComposerComposition as ComposerScene,
  ComposerMotionPresetId,
  ComposerNode,
} from "../../packages/project-model/src";
import {getComposerComponent} from "./registry";
import {getRuntimeTemplate} from "../templates/definitions";
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
  if (preset === "scale") return {x: 0, y: 0, scale: 0.62 + progress * 0.38, opacity: progress, blur: 0};
  if (preset === "pop") return {x: 0, y: 0, scale: 0.72 + progress * 0.28, opacity: Math.min(1, progress * 1.5), blur: 0};
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
  const ease = Easing.bezier(0.16, 1, 0.3, 1);
  const rawEnter = interpolate(frame, [0, enterFrames], [0, 1], {extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: ease});
  const enterProgress = node.motion.enter === "pop" && !reducedMotion
    ? Math.min(1.08, spring({frame, fps, durationInFrames: enterFrames, config: {damping: 13, stiffness: 170, mass: 0.8}}))
    : rawEnter;
  const exitProgress = interpolate(frame, [Math.max(0, duration - exitFrames), Math.max(1, duration - 1)], [1, 0], {extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: ease});
  const enterPreset = reducedMotion && node.motion.enter !== "none" ? "fade" : node.motion.enter;
  const exitPreset = reducedMotion && node.motion.exit !== "none" ? "fade" : node.motion.exit;
  const enter = getRevealStyle(enterPreset, enterProgress, node.motion.intensity, unit);
  const exit = getRevealStyle(exitPreset, exitProgress, node.motion.intensity, unit);
  const seconds = frame / Math.max(1, fps) * speed;
  let loopX = 0;
  let loopY = 0;
  let loopScale = 1;
  let loopRotate = 0;
  let loopOpacity = 1;
  if (!reducedMotion && motionSupportsLoop(node.motion.loop)) {
    const wave = Math.sin(seconds * Math.PI * 2 / 2.4);
    if (node.motion.loop === "float") loopY = wave * 12 * node.motion.intensity * unit;
    if (node.motion.loop === "drift") loopX = wave * 14 * node.motion.intensity * unit;
    if (node.motion.loop === "pulse") loopScale = 1 + wave * 0.025 * node.motion.intensity;
    if (node.motion.loop === "rotate") loopRotate = seconds * 12 * node.motion.intensity;
    if (node.motion.loop === "breathe") loopOpacity = 0.88 + (wave + 1) * 0.06;
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
  const full: CSSProperties = {width: "100%", height: "100%"};
  const alignItems = asString(props.align, "left") === "center" ? "center" : asString(props.align, "left") === "right" ? "flex-end" : "flex-start";

  if (node.componentId === "title" || node.componentId === "body-text") {
    return <div style={{...full, display: "flex", alignItems: "center", justifyContent: alignItems, color: asString(props.color, "#F4F7FB"), fontFamily, fontSize: asNumber(props.fontSize, node.componentId === "title" ? 96 : 42) * unit, fontWeight: asNumber(props.fontWeight, 600), lineHeight: asNumber(props.lineHeight, 1.08), textAlign: asString(props.align, "left") as CSSProperties["textAlign"], whiteSpace: "pre-wrap", overflow: "hidden"}}>{asString(props.text)}</div>;
  }

  if (node.componentId === "stat-number") {
    const duration = Math.max(1, Math.round(0.8 * fps / motion.speed));
    const progress = motion.reducedMotion ? 1 : interpolate(frame, [0, duration], [0, 1], {extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.bezier(0.16, 1, 0.3, 1)});
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
    const progress = motion.reducedMotion ? 1 : interpolate(frame, [0, Math.max(1, fps)], [0, 1], {extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.bezier(0.16, 1, 0.3, 1)});
    return <div style={{...full, display: "flex", flexDirection: "column", justifyContent: "center", color: "#F4F7FB", fontFamily}}><div style={{display: "flex", justifyContent: "space-between", alignItems: "baseline", fontSize: 28 * unit, fontWeight: 620}}><span>{asString(props.label)}</span>{asBoolean(props.showValue, true) && <strong style={{fontVariantNumeric: "tabular-nums"}}>{Math.round(value * progress)}%</strong>}</div><div style={{height: 18 * unit, marginTop: 18 * unit, borderRadius: 999, background: asString(props.trackColor), overflow: "hidden"}}><div style={{width: `${value * progress}%`, height: "100%", borderRadius: 999, background: asString(props.accentColor)}} /></div></div>;
  }

  if (node.componentId === "callout") return <div style={{...full, display: "flex", flexDirection: "column", justifyContent: "center", padding: 34 * unit, color: asString(props.textColor), background: asString(props.backgroundColor), border: `2px solid ${asString(props.accentColor)}`, borderRadius: asNumber(props.radius) * unit, fontFamily, overflow: "hidden"}}><strong style={{fontSize: 34 * unit, lineHeight: 1.1}}>{asString(props.title)}</strong><span style={{marginTop: 16 * unit, color: "rgba(244,247,251,0.72)", fontSize: 25 * unit, lineHeight: 1.35, whiteSpace: "pre-wrap"}}>{asString(props.body)}</span></div>;
  if (node.componentId === "lower-third") return <div style={{...full, display: "flex", alignItems: "stretch", fontFamily, flexDirection: asString(props.align) === "right" ? "row-reverse" : "row"}}><div style={{width: 12 * unit, background: asString(props.accentColor)}} /><div style={{display: "flex", flex: 1, flexDirection: "column", justifyContent: "center", alignItems, padding: `0 ${30 * unit}px`, color: asString(props.textColor), background: "rgba(14,19,26,0.88)"}}><strong style={{fontSize: 42 * unit, lineHeight: 1.05}}>{asString(props.name)}</strong><span style={{marginTop: 10 * unit, color: "rgba(244,247,251,0.66)", fontSize: 24 * unit}}>{asString(props.role)}</span></div></div>;

  if (node.componentId === "bar-chart") {
    const labels = asString(props.labels).split(",").map((value) => value.trim()).filter(Boolean).slice(0, 12);
    const values = asString(props.values).split(",").map(Number).map((value) => Number.isFinite(value) ? value : 0).slice(0, labels.length);
    const maximum = Math.max(1, ...values);
    const progress = motion.reducedMotion ? 1 : interpolate(frame, [0, Math.max(1, Math.round(fps * 1.1))], [0, 1], {extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.bezier(0.16, 1, 0.3, 1)});
    return <div style={{...full, display: "flex", flexDirection: "column", color: asString(props.textColor), fontFamily}}><strong style={{fontSize: 32 * unit}}>{asString(props.title)}</strong><div style={{display: "flex", flex: 1, alignItems: "flex-end", gap: 18 * unit, paddingTop: 24 * unit}}>{labels.map((label, index) => {const value = values[index] ?? 0; return <div key={`${label}-${index}`} style={{display: "flex", flex: 1, minWidth: 0, height: "100%", flexDirection: "column", justifyContent: "flex-end", alignItems: "center"}}>{asBoolean(props.showValues, true) && <span style={{fontSize: 20 * unit, fontVariantNumeric: "tabular-nums"}}>{value}</span>}<div style={{width: "70%", height: `${Math.max(2, value / maximum * progress * 80)}%`, marginTop: 8 * unit, borderRadius: `${9 * unit}px ${9 * unit}px 0 0`, background: asString(props.accentColor)}} /><span style={{width: "100%", marginTop: 10 * unit, overflow: "hidden", textAlign: "center", textOverflow: "ellipsis", whiteSpace: "nowrap", color: "rgba(244,247,251,0.68)", fontSize: 18 * unit}}>{label}</span></div>;})}</div></div>;
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
