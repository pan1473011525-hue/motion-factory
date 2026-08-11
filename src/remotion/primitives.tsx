import {createContext, useContext, useEffect, useMemo, useState} from "react";
import {Video} from "@remotion/media";
import {
  AbsoluteFill,
  Easing,
  Img,
  continueRender,
  delayRender,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import type {ProjectAsset, TemplateAppearance} from "../../packages/project-model/src";
import {getFixedEdgesTimeline} from "../../packages/template-sdk/src";

export type MotionTheme = {
  id: string;
  ink: string;
  muted: string;
  surface: string;
  surfaceSoft: string;
  grid: string;
  accent: string;
  radius: number;
};

const defaultTheme: MotionTheme = {
  id: "editorial",
  ink: "#F7F9FB",
  muted: "rgba(247,249,251,0.62)",
  surface: "rgba(12,18,25,0.94)",
  surfaceSoft: "rgba(12,18,25,0.78)",
  grid: "rgba(255,255,255,0.16)",
  accent: "#47A7FF",
  radius: 18,
};

const themeContext = createContext<MotionTheme>(defaultTheme);
const templateAppearanceContext = createContext<TemplateAppearance | undefined>(undefined);

const colorWithOpacity = (color: string, opacity: number): string => {
  const red = Number.parseInt(color.slice(1, 3), 16);
  const green = Number.parseInt(color.slice(3, 5), 16);
  const blue = Number.parseInt(color.slice(5, 7), 16);
  return `rgba(${red},${green},${blue},${opacity})`;
};

const isLightSurface = (color: string): boolean => {
  const channels = [1, 3, 5].map((offset) => Number.parseInt(color.slice(offset, offset + 2), 16) / 255)
    .map((channel) => channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4);
  return 0.2126 * (channels[0] ?? 0) + 0.7152 * (channels[1] ?? 0) + 0.0722 * (channels[2] ?? 0) > 0.42;
};

export const getMotionTheme = (preset: string, accent: string, appearance?: TemplateAppearance): MotionTheme => {
  const base = preset === "minimal" ? {
    id: preset,
    ink: "#FFFFFF",
    muted: "rgba(255,255,255,0.58)",
    surface: "rgba(7,10,14,0.64)",
    surfaceSoft: "rgba(7,10,14,0.46)",
    grid: "rgba(255,255,255,0.26)",
    accent,
    radius: 8,
  } : preset === "vibrant" || preset === "sport" ? {
    id: preset,
    ink: "#FFFFFF",
    muted: "rgba(255,255,255,0.7)",
    surface: "rgba(5,8,12,0.96)",
    surfaceSoft: "rgba(5,8,12,0.84)",
    grid: "rgba(255,255,255,0.18)",
    accent,
    radius: 4,
  } : {...defaultTheme, accent};
  if (!appearance?.surfaceColor) return base;
  const light = appearance.surfaceTone === "light" || (appearance.surfaceTone === "auto" && isLightSurface(appearance.surfaceColor));
  const opacity = appearance.surfaceOpacity;
  return {
    ...base,
    ink: light ? "#111418" : "#F7F9FB",
    muted: light ? "rgba(17,20,24,0.68)" : "rgba(247,249,251,0.66)",
    grid: light ? "rgba(17,20,24,0.18)" : "rgba(255,255,255,0.18)",
    surface: colorWithOpacity(appearance.surfaceColor, opacity),
    surfaceSoft: colorWithOpacity(appearance.surfaceColor, opacity * 0.82),
  };
};

export const TemplateAppearanceProvider: React.FC<{appearance?: TemplateAppearance; children: React.ReactNode}> = ({appearance, children}) => (
  <templateAppearanceContext.Provider value={appearance}>{children}</templateAppearanceContext.Provider>
);

export const useResolvedMotionTheme = (preset: string, accent: string): MotionTheme => {
  const appearance = useContext(templateAppearanceContext);
  return getMotionTheme(preset, accent, appearance);
};

export const ThemeProvider: React.FC<{
  preset: string;
  accent: string;
  children: React.ReactNode;
}> = ({preset, accent, children}) => {
  const appearance = useContext(templateAppearanceContext);
  return <themeContext.Provider value={getMotionTheme(preset, accent, appearance)}>{children}</themeContext.Provider>;
};

export const useMotionTheme = (): MotionTheme => useContext(themeContext);

export type RuntimeAsset = ProjectAsset & {src?: string};

const assetsContext = createContext<ReadonlyArray<RuntimeAsset>>([]);
const fontFamilyContext = createContext("-apple-system, BlinkMacSystemFont, 'SF Pro Display', 'PingFang SC', sans-serif");
export type MotionSettings = {speed: number; reducedMotion: boolean; edgeFrames: number};
const motionSettingsContext = createContext<MotionSettings>({speed: 1, reducedMotion: false, edgeFrames: 18});

export const MediaAssetProvider: React.FC<{
  assets: ReadonlyArray<RuntimeAsset>;
  children: React.ReactNode;
}> = ({assets, children}) => <assetsContext.Provider value={assets}>{children}</assetsContext.Provider>;

export const useMediaAsset = (assetId: string): RuntimeAsset | null =>
  useContext(assetsContext).find((asset) => asset.id === assetId) ?? null;

export const MotionSettingsProvider: React.FC<{settings?: MotionSettings; children: React.ReactNode}> = ({settings, children}) => (
  <motionSettingsContext.Provider value={settings ?? {speed: 1, reducedMotion: false, edgeFrames: 18}}>{children}</motionSettingsContext.Provider>
);

export const useMotionSettings = (): MotionSettings => useContext(motionSettingsContext);

const fallbackFamilies = {
  system: "-apple-system, BlinkMacSystemFont, 'SF Pro Display', 'PingFang SC', sans-serif",
  serif: "'Songti SC', 'Noto Serif CJK SC', Georgia, serif",
  mono: "'SF Mono', 'PingFang SC', ui-monospace, monospace",
} as const;

export const ProjectFontProvider: React.FC<{
  fontAssetId?: string;
  fallbackFamily?: keyof typeof fallbackFamilies;
  assets: ReadonlyArray<RuntimeAsset>;
  children: React.ReactNode;
}> = ({fontAssetId = "", fallbackFamily = "system", assets, children}) => {
  const asset = assets.find((candidate) => candidate.id === fontAssetId && candidate.kind === "font");
  const src = asset?.src ?? (asset ? localFileUrl(asset.path) : null);
  const family = useMemo(() => `MotionerCustom-${fontAssetId.replace(/[^a-zA-Z0-9_-]/gu, "").slice(0, 32) || "Font"}`, [fontAssetId]);
  const [loaded, setLoaded] = useState(!src);
  const [handle] = useState(() => src ? delayRender(`加载项目字体 ${family}`) : null);
  useEffect(() => {
    if (!src) return;
    let active = true;
    const face = new FontFace(family, `url(${JSON.stringify(src)})`);
    void face.load().then((font) => {
      if (!active) return;
      document.fonts.add(font);
      setLoaded(true);
    }).catch(() => setLoaded(true));
    return () => { active = false; };
  }, [family, src]);
  useEffect(() => {
    if (loaded && handle !== null) continueRender(handle);
  }, [handle, loaded]);
  const resolved = src && loaded ? `'${family}', ${fallbackFamilies[fallbackFamily]}` : fallbackFamilies[fallbackFamily];
  return <fontFamilyContext.Provider value={resolved}>{children}</fontFamilyContext.Provider>;
};

export const useProjectFontFamily = (): string => useContext(fontFamilyContext);

export const useCanvasUnit = (): number => {
  const {width, height} = useVideoConfig();
  return Math.min(width / 1920, height / 1080);
};

export const AlphaSurface: React.FC<{children: React.ReactNode}> = ({children}) => {
  const fontFamily = useProjectFontFamily();
  return <AbsoluteFill
    style={{
      backgroundColor: "transparent",
      color: "white",
      fontFamily,
    }}
  >
    {children}
  </AbsoluteFill>;
};

export const SafeArea: React.FC<{
  children: React.ReactNode;
  inset?: number;
  style?: React.CSSProperties;
}> = ({children, inset = 0.06, style}) => (
  <div style={{position: "absolute", inset: `${inset * 100}%`, ...style}}>{children}</div>
);

export const EntranceExit: React.FC<{
  children: React.ReactNode;
  edgeFrames?: number;
  distance?: number;
  direction?: "up" | "down" | "left" | "right";
  style?: React.CSSProperties;
}> = ({children, edgeFrames, distance = 36, direction = "up", style}) => {
  const frame = useCurrentFrame();
  const {durationInFrames, fps} = useVideoConfig();
  const motion = useContext(motionSettingsContext);
  const scaledEdge = Math.max(8, Math.round((((edgeFrames ?? motion.edgeFrames) / motion.speed) / 30) * fps));
  const timing = getFixedEdgesTimeline(frame, durationInFrames, scaledEdge);
  const progress = timing.phase === "outro" ? 1 - timing.phaseProgress : timing.phase === "intro" ? timing.phaseProgress : 1;
  const eased = Easing.bezier(0.16, 1, 0.3, 1)(progress);
  const safeDistance = motion.reducedMotion ? 0 : distance;
  const x = direction === "left" ? (1 - eased) * safeDistance : direction === "right" ? (eased - 1) * safeDistance : 0;
  const y = direction === "up" ? (1 - eased) * safeDistance : direction === "down" ? (eased - 1) * safeDistance : 0;
  return <div style={{opacity: progress, transform: `translate3d(${x}px, ${y}px, 0)`, ...style}}>{children}</div>;
};

export const FixedEdgesTimeline = ({edgeFrames = 18}: {edgeFrames?: number}): {intro: number; hold: number; outro: number} => {
  const frame = useCurrentFrame();
  const {durationInFrames, fps} = useVideoConfig();
  const timing = getFixedEdgesTimeline(frame, durationInFrames, Math.max(8, Math.round(edgeFrames * fps / 30)));
  return {
    intro: timing.phase === "intro" ? timing.phaseProgress : 1,
    hold: timing.phase === "hold" ? timing.phaseProgress : timing.phase === "outro" ? 1 : 0,
    outro: timing.phase === "outro" ? timing.phaseProgress : 0,
  };
};

export const AnimatedNumber: React.FC<{
  value: number;
  decimals?: number;
  prefix?: string;
  suffix?: string;
  startFrame?: number;
  durationFrames?: number;
}> = ({value, decimals = 0, prefix = "", suffix = "", startFrame = 8, durationFrames = 54}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const motion = useContext(motionSettingsContext);
  const progress = motion.reducedMotion ? 1 : spring({frame: frame - Math.round(startFrame * fps / 30), fps, config: {damping: 28, stiffness: 90}, durationInFrames: Math.round(durationFrames * fps / (30 * motion.speed))});
  const displayed = value * progress;
  return <>{prefix}{displayed.toLocaleString("zh-CN", {minimumFractionDigits: decimals, maximumFractionDigits: decimals})}{suffix}</>;
};

export const TextFit: React.FC<{
  children: string;
  maxSize: number;
  minSize?: number;
  maxCharacters?: number;
  style?: React.CSSProperties;
}> = ({children, maxSize, minSize = maxSize * 0.54, maxCharacters = 18, style}) => {
  const unit = useCanvasUnit();
  const density = Math.max(1, children.length / maxCharacters);
  const fontSize = Math.max(minSize, maxSize / Math.sqrt(density)) * unit;
  return <div style={{fontSize, overflowWrap: "anywhere", ...style}}>{children}</div>;
};

export const RevealText: React.FC<{
  children: string;
  startFrame?: number;
  style?: React.CSSProperties;
}> = ({children, startFrame = 10, style}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const motion = useContext(motionSettingsContext);
  if (motion.reducedMotion) return <div style={style}>{children}</div>;
  const progress = interpolate(frame, [startFrame * fps / 30, (startFrame + 18) * fps / 30], [0, 1], {extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.bezier(0.16, 1, 0.3, 1)});
  return <div style={{clipPath: `inset(0 ${(1 - progress) * 100}% 0 0)`, ...style}}>{children}</div>;
};

export const StaggerGroup: React.FC<{
  index: number;
  children: React.ReactNode;
  startFrame?: number;
  staggerFrames?: number;
  style?: React.CSSProperties;
}> = ({index, children, startFrame = 10, staggerFrames = 4, style}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const motion = useContext(motionSettingsContext);
  const start = (startFrame + (motion.reducedMotion ? 0 : index) * staggerFrames) * fps / 30;
  const progress = interpolate(frame, [start, start + 16 * fps / (30 * motion.speed)], [0, 1], {extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.bezier(0.16, 1, 0.3, 1)});
  return <div style={{opacity: progress, transform: `translateY(${motion.reducedMotion ? 0 : (1 - progress) * 24}px)`, ...style}}>{children}</div>;
};

const localFileUrl = (path: string): string => `file://${encodeURI(path)}`;

export const MediaSlot: React.FC<{
  assetId: string;
  fit?: "cover" | "contain" | "fill";
  focalX?: number;
  focalY?: number;
  scale?: number;
  radius?: number;
  trimBeforeFrames?: number;
  inSeconds?: number;
  outSeconds?: number;
  playbackRate?: number;
  playbackMode?: "once" | "loop" | "hold";
  label?: string;
  style?: React.CSSProperties;
}> = ({assetId, fit = "cover", focalX = 50, focalY = 50, scale = 1, radius = 0, trimBeforeFrames = 0, inSeconds, outSeconds = 0, playbackRate = 1, playbackMode = "hold", label = "媒体素材", style}) => {
  const asset = useMediaAsset(assetId);
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const commonStyle: React.CSSProperties = {width: "100%", height: "100%", objectFit: fit, objectPosition: `${focalX}% ${focalY}%`, transform: `scale(${scale})`, borderRadius: radius, ...style};
  if (!asset) return <div style={{display: "grid", placeItems: "center", width: "100%", height: "100%", color: "rgba(255,255,255,0.5)", background: "rgba(255,255,255,0.08)", border: "2px dashed rgba(255,255,255,0.24)", fontSize: 26, ...style}}>{label}</div>;
  if (asset.kind !== "video") return <Img src={asset.src ?? localFileUrl(asset.path)} style={commonStyle} />;
  const previewSrc = asset.src ?? localFileUrl(asset.proxyPath ?? asset.path);
  const start = Math.max(0, Math.round((inSeconds ?? trimBeforeFrames / fps) * fps));
  const end = outSeconds > (inSeconds ?? 0) ? Math.round(outSeconds * fps) : null;
  const elapsed = Math.max(0, Math.floor(frame * playbackRate));
  const segment = end === null ? null : Math.max(1, end - start);
  if (segment !== null && playbackMode === "once" && elapsed >= segment) return null;
  // @remotion/media 的 <Video>:预览端 Mediabunny 并行解码,渲染端自动回退 OffthreadVideo 抽帧,
  // 入点/出点/倍速/循环交给组件原生参数,替代手写 Freeze+帧计算。
  return <Video
    src={previewSrc}
    trimBefore={start / fps}
    trimAfter={end === null ? undefined : end / fps}
    playbackRate={playbackRate}
    loop={playbackMode === "loop"}
    muted
    style={commonStyle}
  />;
};

export const SourceFooter: React.FC<{source: string; style?: React.CSSProperties}> = ({source, style}) => {
  const theme = useMotionTheme();
  const unit = useCanvasUnit();
  if (!source) return null;
  return <div style={{color: theme.muted, fontSize: 25 * unit, letterSpacing: "0.01em", ...style}}>来源：{source}</div>;
};

export const DataLabel: React.FC<{label: string; value?: string; style?: React.CSSProperties}> = ({label, value, style}) => {
  const theme = useMotionTheme();
  const unit = useCanvasUnit();
  return <div style={{display: "flex", justifyContent: "space-between", gap: 12, color: theme.ink, fontSize: 25 * unit, ...style}}><span>{label}</span>{value && <strong>{value}</strong>}</div>;
};

export const GridLines: React.FC<{count?: number; vertical?: boolean}> = ({count = 5, vertical = false}) => {
  const theme = useMotionTheme();
  return <>{Array.from({length: count}).map((_value, index) => <span key={index} style={{position: "absolute", ...(vertical ? {left: `${index * 100 / Math.max(1, count - 1)}%`, top: 0, bottom: 0, borderLeft: `1px solid ${theme.grid}`} : {top: `${index * 100 / Math.max(1, count - 1)}%`, left: 0, right: 0, borderTop: `1px solid ${theme.grid}`})}} />)}</>;
};

export const Axis: React.FC<{labels: ReadonlyArray<string>; direction?: "x" | "y"}> = ({labels, direction = "x"}) => {
  const theme = useMotionTheme();
  const unit = useCanvasUnit();
  return <div style={{display: "flex", flexDirection: direction === "x" ? "row" : "column-reverse", justifyContent: "space-between", color: theme.muted, fontSize: 20 * unit}}>{labels.map((label, index) => <span key={`${label}-${index}`}>{label}</span>)}</div>;
};

export const BarMark: React.FC<{
  progress: number;
  direction?: "horizontal" | "vertical";
  color?: string;
  style?: React.CSSProperties;
}> = ({progress, direction = "horizontal", color, style}) => {
  const theme = useMotionTheme();
  return <div style={{width: direction === "horizontal" ? `${Math.max(0, progress) * 100}%` : "100%", height: direction === "vertical" ? `${Math.max(0, progress) * 100}%` : "100%", background: color ?? theme.accent, borderRadius: theme.radius * 0.45, ...style}} />;
};

export const Legend: React.FC<{items: ReadonlyArray<{label: string; color: string}>}> = ({items}) => {
  const theme = useMotionTheme();
  const unit = useCanvasUnit();
  return <div style={{display: "flex", flexWrap: "wrap", gap: 24 * unit, color: theme.muted, fontSize: 21 * unit}}>{items.map((item) => <span key={item.label} style={{display: "flex", alignItems: "center", gap: 8 * unit}}><i style={{width: 10 * unit, height: 10 * unit, borderRadius: 99, background: item.color}} />{item.label}</span>)}</div>;
};

export type Point = {x: number; y: number};

export const LinePath: React.FC<{
  points: ReadonlyArray<Point>;
  color?: string;
  strokeWidth?: number;
  progress?: number;
}> = ({points, color, strokeWidth = 5, progress = 1}) => {
  const theme = useMotionTheme();
  if (points.length === 0) return null;
  const path = points.map((point, index) => `${index === 0 ? "M" : "L"}${point.x},${point.y}`).join(" ");
  return <path d={path} fill="none" stroke={color ?? theme.accent} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" pathLength={1} strokeDasharray={1} strokeDashoffset={1 - progress} />;
};

const polar = (cx: number, cy: number, radius: number, angle: number): Point => ({x: cx + radius * Math.cos(angle - Math.PI / 2), y: cy + radius * Math.sin(angle - Math.PI / 2)});

export const donutArcPath = (cx: number, cy: number, outer: number, inner: number, startAngle: number, endAngle: number): string => {
  const startOuter = polar(cx, cy, outer, startAngle);
  const endOuter = polar(cx, cy, outer, endAngle);
  const startInner = polar(cx, cy, inner, endAngle);
  const endInner = polar(cx, cy, inner, startAngle);
  const largeArc = endAngle - startAngle > Math.PI ? 1 : 0;
  return `M ${startOuter.x} ${startOuter.y} A ${outer} ${outer} 0 ${largeArc} 1 ${endOuter.x} ${endOuter.y} L ${startInner.x} ${startInner.y} A ${inner} ${inner} 0 ${largeArc} 0 ${endInner.x} ${endInner.y} Z`;
};

export const DonutArc: React.FC<{
  cx: number;
  cy: number;
  outer: number;
  inner: number;
  startAngle: number;
  endAngle: number;
  color: string;
}> = (props) => <path d={donutArcPath(props.cx, props.cy, props.outer, props.inner, props.startAngle, props.endAngle)} fill={props.color} />;
