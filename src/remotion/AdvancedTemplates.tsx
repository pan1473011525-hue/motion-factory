import {Easing, interpolate, useCurrentFrame, useVideoConfig} from "remotion";
import type {AlphaTestCardProps} from "../templates/alpha-test-card/manifest";
import type {BeforeAfterProps} from "../templates/before-after/manifest";
import type {CalloutAnnotationProps} from "../templates/callout-annotation/manifest";
import type {MediaCarouselProps} from "../templates/media-carousel/manifest";
import type {MultiLineProps} from "../templates/multi-line/manifest";
import type {NewsTitleProps} from "../templates/news-title/manifest";
import type {RouteMapProps} from "../templates/route-map/manifest";
import type {SplitScreenProps} from "../templates/split-screen/manifest";
import type {SportsScoreboardProps} from "../templates/sports-scoreboard/manifest";
import type {StackedBarsProps} from "../templates/stacked-bars/manifest";
import {
  AlphaSurface,
  EntranceExit,
  getMotionTheme,
  GridLines,
  MediaSlot,
  SafeArea,
  SourceFooter,
  StaggerGroup,
  TextFit,
  ThemeProvider,
  useCanvasUnit,
  useMotionTheme,
} from "./primitives";

const AdvancedFrame: React.FC<{preset: string; accent: string; children: React.ReactNode; inset?: number}> = ({preset, accent, children, inset = 0.055}) => (
  <AlphaSurface><ThemeProvider preset={preset} accent={accent}><SafeArea inset={inset}>{children}</SafeArea></ThemeProvider></AlphaSurface>
);

const useResponsiveCanvas = () => {
  const {width, height} = useVideoConfig();
  return {portrait: height / width > 1.18, square: height / width >= 0.82 && height / width <= 1.18};
};

const useDrawProgress = (start = 7, end = 65): number => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  return interpolate(frame, [start * fps / 30, end * fps / 30], [0, 1], {extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.bezier(0.16, 1, 0.3, 1)});
};

const Surface: React.FC<{children: React.ReactNode; style?: React.CSSProperties}> = ({children, style}) => {
  const theme = useMotionTheme();
  const unit = useCanvasUnit();
  return <div style={{boxSizing: "border-box", background: theme.surface, border: `1px solid ${theme.grid}`, borderRadius: theme.radius * unit, boxShadow: "0 18px 70px rgba(0,0,0,.28)", overflow: "hidden", ...style}}>{children}</div>;
};

const Heading: React.FC<{children: string; style?: React.CSSProperties}> = ({children, style}) => {
  const theme = useMotionTheme();
  return <TextFit maxSize={50} minSize={28} maxCharacters={30} style={{color: theme.ink, fontWeight: 720, lineHeight: 1.08, letterSpacing: "-.03em", ...style}}>{children}</TextFit>;
};

export const AlphaTestCard: React.FC<AlphaTestCardProps> = (props) => {
  const theme = getMotionTheme(props.stylePreset, props.accentColor);
  const unit = useCanvasUnit();
  const {portrait} = useResponsiveCanvas();
  const cells = [25, 50, 75, 100];
  return <AdvancedFrame preset={props.stylePreset} accent={props.accentColor}><EntranceExit style={{position: "absolute", inset: 0}}><Surface style={{height: "100%", padding: 44 * unit, display: "grid", gridTemplateRows: "auto 1fr auto", gap: 28 * unit, position: "relative"}}>{props.showGrid && <div style={{position: "absolute", inset: 0, opacity: .36}}><GridLines count={9} /><GridLines count={13} vertical /></div>}<div style={{display: "flex", justifyContent: "space-between", alignItems: "baseline", position: "relative"}}><Heading>{props.title}</Heading><span style={{fontSize: 20 * unit, color: theme.muted, fontFamily: "ui-monospace, monospace"}}>RGBA · Rec.709</span></div><div style={{display: "grid", gridTemplateColumns: portrait ? "repeat(2, 1fr)" : "repeat(4, 1fr)", gap: 18 * unit, alignItems: "stretch", position: "relative"}}>{cells.map((alpha, index) => <StaggerGroup key={alpha} index={index} style={{height: "100%"}}><div style={{height: "100%", minHeight: 120 * unit, border: `1px solid ${theme.grid}`, background: `color-mix(in srgb, ${theme.accent} ${alpha}%, transparent)`, display: "grid", placeItems: "center", position: "relative"}}><strong style={{fontSize: 42 * unit, color: theme.ink}}>{alpha}%</strong><span style={{position: "absolute", left: 12 * unit, bottom: 10 * unit, fontSize: 16 * unit, color: theme.muted}}>ALPHA</span></div></StaggerGroup>)}</div><div style={{display: "grid", gridTemplateColumns: "1fr 1fr 1fr", alignItems: "center", gap: 24 * unit, position: "relative"}}><div style={{height: 1, background: theme.ink}} /><div style={{height: 74 * unit, display: "grid", placeItems: "center"}}><span style={{width: 58 * unit, height: 58 * unit, borderRadius: 999, background: theme.accent, boxShadow: `0 0 ${34 * unit}px ${theme.accent}`}} /></div><div style={{height: 26 * unit, background: `linear-gradient(90deg, transparent, ${theme.accent})`}} /></div></Surface></EntranceExit></AdvancedFrame>;
};

export const RouteMap: React.FC<RouteMapProps> = (props) => {
  const unit = useCanvasUnit();
  const theme = getMotionTheme(props.stylePreset, props.accentColor);
  const draw = useDrawProgress(4, 72);
  const {portrait} = useResponsiveCanvas();
  const path = props.waypoints.map((item, index) => `${index === 0 ? "M" : "L"}${item.x * 10},${item.y * 6}`).join(" ");
  return <AdvancedFrame preset={props.stylePreset} accent={props.accentColor}><EntranceExit style={{position: "absolute", inset: 0}}><Surface style={{height: "100%", padding: 42 * unit, display: "grid", gridTemplateRows: "auto 1fr auto", gap: 24 * unit}}><div style={{display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 20 * unit}}><Heading>{props.title}</Heading>{props.showDistance && <span style={{color: theme.accent, fontSize: 20 * unit, fontFamily: "ui-monospace, monospace"}}>{Math.round(draw * 100)}% ROUTE</span>}</div><div style={{position: "relative", minHeight: 0, background: props.stylePreset === "night" ? "rgba(18,46,58,.54)" : theme.surfaceSoft, borderRadius: theme.radius * unit}}><svg viewBox="0 0 1000 600" preserveAspectRatio={portrait ? "xMidYMid meet" : "none"} style={{width: "100%", height: "100%", overflow: "visible"}}><defs><pattern id="route-grid" width="62.5" height="50" patternUnits="userSpaceOnUse"><path d="M 62.5 0 L 0 0 0 50" fill="none" stroke={theme.grid} strokeWidth="1" /></pattern></defs><rect width="1000" height="600" fill="url(#route-grid)" /><path d="M40 475 C185 310 230 355 350 205 S590 290 720 135 S890 155 970 65" fill="none" stroke={theme.grid} strokeWidth="32" opacity=".28" /><path d={path} fill="none" stroke={theme.accent} strokeWidth="8" strokeLinecap="round" strokeLinejoin="round" pathLength={1} strokeDasharray={1} strokeDashoffset={1 - draw} />{props.waypoints.map((item, index) => {const visible = draw >= index / Math.max(1, props.waypoints.length - 1); return <g key={`${item.label}-${index}`} opacity={visible ? 1 : 0}><circle cx={item.x * 10} cy={item.y * 6} r="17" fill={theme.surface} stroke={item.color} strokeWidth="8" /><text x={item.x * 10} y={item.y * 6 - 32} textAnchor="middle" fill={theme.ink} fontSize="25" fontWeight="700">{item.label}</text><text x={item.x * 10} y={item.y * 6 + 48} textAnchor="middle" fill={theme.muted} fontSize="17">{String(index + 1).padStart(2, "0")}</text></g>;})}</svg></div><SourceFooter source={props.source} /></Surface></EntranceExit></AdvancedFrame>;
};

const parseValues = (value: string): number[] => value.split(/[，,]/u).map((item) => Number(item.trim())).filter(Number.isFinite);

export const MultiLine: React.FC<MultiLineProps> = (props) => {
  const unit = useCanvasUnit();
  const theme = getMotionTheme(props.stylePreset, props.accentColor);
  const draw = useDrawProgress();
  const labels = props.xLabels.split(/[，,]/u).map((item) => item.trim()).filter(Boolean);
  const values = props.series.flatMap((item) => parseValues(item.values));
  const minimum = Math.min(0, ...values);
  const maximum = Math.max(1, ...values);
  const range = Math.max(1, maximum - minimum);
  return <AdvancedFrame preset={props.stylePreset} accent={props.accentColor}><EntranceExit style={{position: "absolute", inset: 0}}><Surface style={{height: "100%", padding: 42 * unit, display: "grid", gridTemplateRows: "auto 1fr auto", gap: 20 * unit}}><div style={{display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 28 * unit}}><Heading>{props.title}</Heading><div style={{display: "flex", flexWrap: "wrap", justifyContent: "flex-end", gap: 18 * unit}}>{props.series.map((series) => <span key={series.label} style={{display: "flex", alignItems: "center", gap: 8 * unit, fontSize: 18 * unit, color: theme.muted}}><i style={{width: 22 * unit, height: 4 * unit, background: series.color}} />{series.label}</span>)}</div></div><div style={{position: "relative", minHeight: 0}}><svg viewBox="0 0 1200 570" style={{width: "100%", height: "100%", overflow: "visible"}}>{[0,1,2,3,4].map((index) => <line key={index} x1="45" x2="1160" y1={60 + index * 112} y2={60 + index * 112} stroke={theme.grid} />)}{props.series.map((series, seriesIndex) => {const seriesValues = parseValues(series.values); const points = seriesValues.map((value, index) => ({x: 45 + index * 1115 / Math.max(1, seriesValues.length - 1), y: 508 - (value - minimum) / range * 448})); const d = points.map((point, index) => `${index === 0 ? "M" : "L"}${point.x},${point.y}`).join(" "); return <g key={`${series.label}-${seriesIndex}`}><path d={d} fill="none" stroke={props.stylePreset === "minimal" && seriesIndex > 0 ? theme.muted : series.color} strokeWidth={seriesIndex === 0 ? 7 : 5} strokeLinecap="round" strokeLinejoin="round" pathLength={1} strokeDasharray={1} strokeDashoffset={1 - draw} />{props.showPoints && points.map((point, index) => <circle key={index} cx={point.x} cy={point.y} r="7" fill={theme.surface} stroke={series.color} strokeWidth="4" opacity={draw >= index / Math.max(1, points.length - 1) ? 1 : 0} />)}</g>;})}</svg><div style={{position: "absolute", left: "4%", right: "3%", bottom: 0, display: "flex", justifyContent: "space-between", color: theme.muted, fontSize: 17 * unit}}>{labels.map((label, index) => <span key={`${label}-${index}`}>{label}</span>)}</div></div><SourceFooter source={props.source} /></Surface></EntranceExit></AdvancedFrame>;
};

export const StackedBars: React.FC<StackedBarsProps> = (props) => {
  const unit = useCanvasUnit();
  const theme = getMotionTheme(props.stylePreset, props.accentColor);
  const draw = useDrawProgress();
  const totals = props.items.map((item) => Math.max(0, item.first) + Math.max(0, item.second) + Math.max(0, item.third));
  const maximum = Math.max(1, ...totals);
  const {portrait} = useResponsiveCanvas();
  const colors = [props.color1, props.color2, props.color3];
  return <AdvancedFrame preset={props.stylePreset} accent={props.accentColor}><EntranceExit style={{position: "absolute", inset: 0}}><Surface style={{height: "100%", padding: 42 * unit, display: "grid", gridTemplateRows: "auto 1fr auto", gap: 20 * unit}}><div style={{display: "flex", justifyContent: "space-between", gap: 24 * unit, alignItems: "flex-start"}}><Heading>{props.title}</Heading><div style={{display: "flex", flexDirection: portrait ? "column" : "row", gap: 14 * unit}}>{[props.label1, props.label2, props.label3].map((label, index) => <span key={label} style={{fontSize: 17 * unit, color: theme.muted, display: "flex", alignItems: "center", gap: 7 * unit}}><i style={{width: 10 * unit, height: 10 * unit, background: colors[index]}} />{label}</span>)}</div></div><div style={{position: "relative", minHeight: 0}}><GridLines count={5} /><div style={{position: "absolute", inset: `${16 * unit}px 0 0`, display: "flex", alignItems: "flex-end", gap: 15 * unit}}>{props.items.map((item, index) => {const itemValues = [item.first, item.second, item.third].map((value) => Math.max(0, value)); const total = totals[index] ?? 0; return <StaggerGroup key={`${item.label}-${index}`} index={index} style={{height: "100%", flex: 1, display: "flex", flexDirection: "column", justifyContent: "flex-end", alignItems: "stretch"}}><strong style={{fontSize: 18 * unit, textAlign: "center", marginBottom: 7 * unit}}>{total}</strong><div style={{height: `${Math.max(.015, total / maximum * draw) * 82}%`, minHeight: 2, display: "flex", flexDirection: "column-reverse"}}>{itemValues.map((value, segment) => <span key={segment} style={{height: `${total > 0 ? value / total * 100 : 0}%`, background: colors[segment], borderTop: segment > 0 ? `1px solid ${theme.surface}` : undefined}} />)}</div><span style={{fontSize: 17 * unit, color: theme.muted, textAlign: "center", marginTop: 8 * unit}}>{item.label}</span></StaggerGroup>;})}</div></div><SourceFooter source={props.source} /></Surface></EntranceExit></AdvancedFrame>;
};

export const NewsTitle: React.FC<NewsTitleProps> = (props) => {
  const unit = useCanvasUnit();
  const {portrait} = useResponsiveCanvas();
  const chapter = props.layout === "chapter";
  const breaking = props.layout === "breaking";
  const theme = getMotionTheme(props.stylePreset, breaking ? "#FF3B30" : props.accentColor);
  return <AdvancedFrame preset={props.stylePreset} accent={breaking ? "#FF3B30" : props.accentColor}><EntranceExit direction={chapter ? "up" : "left"} style={{position: "absolute", inset: chapter ? "18% 0" : portrait ? "18% 0 8%" : "auto 0 0"}}><Surface style={{height: "100%", minHeight: chapter ? undefined : 260 * unit, padding: `${42 * unit}px ${portrait ? 38 : 58} ${unit}px`, display: "flex", flexDirection: "column", justifyContent: "center", textAlign: chapter ? "center" : "left", borderTop: `${breaking ? 12 : 6} ${unit}px solid ${theme.accent}`}}><div style={{display: "flex", justifyContent: chapter ? "center" : "space-between", gap: 20 * unit, color: theme.accent, fontSize: 19 * unit, fontWeight: 760, letterSpacing: ".12em"}}><span>{breaking ? "BREAKING NEWS" : props.kicker.toUpperCase()}</span>{!chapter && <span style={{color: theme.muted, letterSpacing: ".02em"}}>{props.edition}</span>}</div><TextFit maxSize={chapter ? 72 : 60} minSize={34} maxCharacters={portrait ? 22 : 32} style={{marginTop: 20 * unit, fontWeight: 790, lineHeight: 1.12, letterSpacing: "-.035em"}}>{props.headline}</TextFit>{props.subheadline && <p style={{maxWidth: chapter ? "78%" : "88%", alignSelf: chapter ? "center" : undefined, margin: `${20 * unit}px 0 0`, fontSize: 24 * unit, color: theme.muted, lineHeight: 1.5}}>{props.subheadline}</p>}</Surface></EntranceExit></AdvancedFrame>;
};

export const SportsScoreboard: React.FC<SportsScoreboardProps> = (props) => {
  const unit = useCanvasUnit();
  const theme = getMotionTheme(props.stylePreset, props.accentColor);
  const {portrait} = useResponsiveCanvas();
  const scoreSize = portrait ? 90 : 116;
  return <AdvancedFrame preset={props.stylePreset} accent={props.accentColor}><EntranceExit style={{position: "absolute", left: 0, right: 0, top: portrait ? "20%" : "28%"}}><Surface style={{borderTop: `${9 * unit}px solid ${theme.accent}`}}><div style={{padding: `${18 * unit}px ${34 * unit}px`, display: "flex", justifyContent: "space-between", color: theme.muted, fontSize: 18 * unit, letterSpacing: ".08em"}}><span>{props.league}</span><strong style={{color: theme.accent}}>{props.status}</strong></div><div style={{display: "grid", gridTemplateColumns: portrait ? "1fr" : "1fr auto 1fr", alignItems: "center", gap: 22 * unit, padding: `${28 * unit}px ${42 * unit}px ${38 * unit}px`}}><Team name={props.teamA} detail={props.detailA} align={portrait ? "center" : "right"} /><div style={{display: "flex", justifyContent: "center", alignItems: "center", gap: 24 * unit, fontVariantNumeric: "tabular-nums", fontSize: scoreSize * unit, lineHeight: 1, fontWeight: 850}}><span>{props.scoreA}</span><i style={{width: 30 * unit, height: 5 * unit, background: theme.accent}} /><span>{props.scoreB}</span></div><Team name={props.teamB} detail={props.detailB} align={portrait ? "center" : "left"} /></div></Surface></EntranceExit></AdvancedFrame>;
};

const Team: React.FC<{name: string; detail: string; align: "left" | "right" | "center"}> = ({name, detail, align}) => {
  const unit = useCanvasUnit();
  const theme = useMotionTheme();
  return <div style={{textAlign: align}}><TextFit maxSize={42} minSize={28} maxCharacters={12} style={{fontWeight: 720}}>{name}</TextFit><span style={{display: "block", marginTop: 10 * unit, color: theme.muted, fontSize: 19 * unit}}>{detail}</span></div>;
};

export const CalloutAnnotation: React.FC<CalloutAnnotationProps> = (props) => {
  const unit = useCanvasUnit();
  const theme = getMotionTheme(props.stylePreset, props.accentColor);
  const draw = useDrawProgress(10, 42);
  const {portrait} = useResponsiveCanvas();
  const labelWidth = portrait ? 58 : 35;
  return <AdvancedFrame preset={props.stylePreset} accent={props.accentColor}><EntranceExit style={{position: "absolute", inset: 0}}><Surface style={{height: "100%", position: "relative"}}><MediaSlot assetId={props.assetId} scale={props.zoom} /><div style={{position: "absolute", inset: 0, background: "linear-gradient(180deg, transparent 55%, rgba(0,0,0,.32))"}} /><svg viewBox="0 0 100 100" preserveAspectRatio="none" style={{position: "absolute", inset: 0, width: "100%", height: "100%", overflow: "visible"}}><line x1={props.targetX} y1={props.targetY} x2={props.labelX + labelWidth / 2} y2={props.labelY} stroke={theme.accent} strokeWidth=".45" vectorEffect="non-scaling-stroke" pathLength={1} strokeDasharray={1} strokeDashoffset={1 - draw} /><circle cx={props.targetX} cy={props.targetY} r="1.2" fill={theme.surface} stroke={theme.accent} strokeWidth=".7" vectorEffect="non-scaling-stroke" /></svg><div style={{position: "absolute", left: `${Math.min(100 - labelWidth, props.labelX)}%`, top: `${Math.min(82, props.labelY)}%`, width: `${labelWidth}%`, padding: `${18 * unit}px ${20 * unit}px`, background: theme.surface, borderLeft: `${6 * unit}px solid ${theme.accent}`, boxSizing: "border-box", opacity: draw}}><strong style={{fontSize: 25 * unit}}>{props.title}</strong><p style={{margin: `${8 * unit}px 0 0`, color: theme.muted, fontSize: 18 * unit, lineHeight: 1.4}}>{props.note}</p></div></Surface></EntranceExit></AdvancedFrame>;
};

export const MediaCarousel: React.FC<MediaCarouselProps> = (props) => {
  const frame = useCurrentFrame();
  const {durationInFrames} = useVideoConfig();
  const unit = useCanvasUnit();
  const theme = getMotionTheme(props.stylePreset, props.accentColor);
  const items = [{asset: props.asset1, label: props.label1}, {asset: props.asset2, label: props.label2}, {asset: props.asset3, label: props.label3}, {asset: props.asset4, label: props.label4}, {asset: props.asset5, label: props.label5}].slice(0, props.itemCount);
  const pageLength = Math.max(1, durationInFrames / items.length);
  const page = Math.min(items.length - 1, Math.floor(frame / pageLength));
  const local = (frame - page * pageLength) / pageLength;
  const entry = props.transition === "cut" ? 1 : interpolate(local, [0, .13], [0, 1], {extrapolateLeft: "clamp", extrapolateRight: "clamp"});
  const current = items[page] ?? items[0];
  return <AdvancedFrame preset={props.stylePreset} accent={props.accentColor}><EntranceExit style={{position: "absolute", inset: 0}}><Surface style={{height: "100%", position: "relative"}}><div style={{position: "absolute", inset: 0, opacity: props.transition === "crossfade" ? entry : 1, transform: props.transition === "slide" ? `translateX(${(1 - entry) * 8}%)` : undefined}}><MediaSlot assetId={current?.asset ?? ""} /></div><div style={{position: "absolute", inset: 0, background: "linear-gradient(180deg, rgba(0,0,0,.06), transparent 55%, rgba(0,0,0,.72))"}} /><div style={{position: "absolute", left: 32 * unit, right: 32 * unit, bottom: 28 * unit, display: "grid", gridTemplateColumns: "1fr auto", alignItems: "end", gap: 24 * unit}}><div><Heading style={{fontSize: undefined}}>{props.title}</Heading><span style={{display: "block", marginTop: 10 * unit, fontSize: 22 * unit, color: theme.ink}}>{current?.label}</span></div><div style={{display: "flex", gap: 8 * unit}}>{items.map((_item, index) => <i key={index} style={{width: index === page ? 32 * unit : 8 * unit, height: 8 * unit, background: index === page ? theme.accent : theme.muted, borderRadius: 99}} />)}</div></div></Surface></EntranceExit></AdvancedFrame>;
};

export const BeforeAfter: React.FC<BeforeAfterProps> = (props) => {
  const unit = useCanvasUnit();
  const theme = getMotionTheme(props.stylePreset, props.accentColor);
  const draw = useDrawProgress(4, 38);
  const vertical = props.orientation === "vertical";
  const divider = 50 + (props.divider - 50) * draw;
  const beforeClip = vertical ? `inset(0 ${100 - divider}% 0 0)` : `inset(0 0 ${100 - divider}% 0)`;
  const afterClip = vertical ? `inset(0 0 0 ${divider}%)` : `inset(${divider}% 0 0 0)`;
  return <AdvancedFrame preset={props.stylePreset} accent={props.accentColor}><EntranceExit style={{position: "absolute", inset: 0}}><Surface style={{height: "100%", position: "relative"}}><div style={{position: "absolute", inset: 0, clipPath: beforeClip}}><MediaSlot assetId={props.beforeAsset} /></div><div style={{position: "absolute", inset: 0, clipPath: afterClip}}><MediaSlot assetId={props.afterAsset} /></div><span style={{position: "absolute", ...(vertical ? {left: `${divider}%`, top: 0, bottom: 0, width: 4 * unit, transform: "translateX(-50%)"} : {top: `${divider}%`, left: 0, right: 0, height: 4 * unit, transform: "translateY(-50%)"}), background: theme.accent, boxShadow: "0 0 22px rgba(0,0,0,.45)"}} /><MediaLabel text={props.beforeLabel} position="start" /><MediaLabel text={props.afterLabel} position="end" /></Surface></EntranceExit></AdvancedFrame>;
};

const MediaLabel: React.FC<{text: string; position: "start" | "end"}> = ({text, position}) => {
  const unit = useCanvasUnit();
  const theme = useMotionTheme();
  return <span style={{position: "absolute", top: 22 * unit, [position === "start" ? "left" : "right"]: 22 * unit, padding: `${9 * unit}px ${14 * unit}px`, color: theme.ink, background: theme.surface, borderTop: `${4 * unit}px solid ${theme.accent}`, fontSize: 19 * unit, fontWeight: 680}}>{text}</span>;
};

export const SplitScreen: React.FC<SplitScreenProps> = (props) => {
  const unit = useCanvasUnit();
  const theme = getMotionTheme(props.stylePreset, props.accentColor);
  const {portrait} = useResponsiveCanvas();
  const items = [{asset: props.asset1, label: props.label1}, {asset: props.asset2, label: props.label2}, {asset: props.asset3, label: props.label3}, {asset: props.asset4, label: props.label4}].slice(0, props.panelCount);
  const lead = props.arrangement === "lead" && items.length > 2 && !portrait;
  const vertical = props.arrangement === "vertical" || portrait;
  const columns = vertical ? 1 : items.length === 2 ? 2 : lead ? 2 : 2;
  return <AdvancedFrame preset={props.stylePreset} accent={props.accentColor}><EntranceExit style={{position: "absolute", inset: 0}}><div style={{height: "100%", display: "grid", gridTemplateRows: props.title ? "auto 1fr" : "1fr", gap: 18 * unit}}>{props.title && <Heading>{props.title}</Heading>}<div style={{minHeight: 0, display: "grid", gridTemplateColumns: `repeat(${columns}, 1fr)`, gridTemplateRows: vertical ? `repeat(${items.length}, 1fr)` : lead ? `repeat(${items.length - 1}, 1fr)` : `repeat(${Math.ceil(items.length / columns)}, 1fr)`, gap: props.gap * unit}}>{items.map((item, index) => <StaggerGroup key={index} index={index} style={{height: "100%", minHeight: 0, ...(lead && index === 0 ? {gridRow: `span ${items.length - 1}`} : {})}}><Surface style={{height: "100%", position: "relative", borderRadius: props.stylePreset === "minimal" ? 0 : theme.radius * unit}}><MediaSlot assetId={item.asset} /><span style={{position: "absolute", left: 13 * unit, bottom: 13 * unit, padding: `${6 * unit}px ${11 * unit}px`, color: theme.ink, background: theme.surface, borderLeft: `${4 * unit}px solid ${theme.accent}`, fontSize: 17 * unit, fontWeight: 650}}>{item.label}</span></Surface></StaggerGroup>)}</div></div></EntranceExit></AdvancedFrame>;
};
