import {Easing, interpolate, useCurrentFrame, useVideoConfig} from "remotion";
import {getNormalizedProgress, getPagination} from "../../packages/template-sdk/src";
import type {DonutShareProps} from "../templates/donut-share/manifest";
import type {DualMetricProps} from "../templates/dual-metric/manifest";
import type {HorizontalRankingProps} from "../templates/horizontal-ranking/manifest";
import type {LineTrendProps} from "../templates/line-trend/manifest";
import type {LowerThirdProps} from "../templates/lower-third/manifest";
import type {MediaGridProps} from "../templates/media-grid/manifest";
import type {MediaInfoProps} from "../templates/media-info/manifest";
import type {QuoteCardProps} from "../templates/quote-card/manifest";
import type {SourceCardProps} from "../templates/source-card/manifest";
import type {TimelineProps} from "../templates/timeline/manifest";
import type {VerticalBarsProps} from "../templates/vertical-bars/manifest";
import {
  AlphaSurface,
  AnimatedNumber,
  Axis,
  BarMark,
  DataLabel,
  DonutArc,
  EntranceExit,
  GridLines,
  Legend,
  LinePath,
  MediaSlot,
  RevealText,
  SafeArea,
  SourceFooter,
  StaggerGroup,
  TextFit,
  ThemeProvider,
  useCanvasUnit,
  useMotionTheme,
  useResolvedMotionTheme,
  type Point,
} from "./primitives";

const TemplateFrame: React.FC<{
  preset: string;
  accent: string;
  children: React.ReactNode;
  inset?: number;
}> = ({preset, accent, children, inset = 0.06}) => (
  <AlphaSurface><ThemeProvider preset={preset} accent={accent}><SafeArea inset={inset}>{children}</SafeArea></ThemeProvider></AlphaSurface>
);

const Panel: React.FC<{children: React.ReactNode; style?: React.CSSProperties}> = ({children, style}) => {
  const theme = useMotionTheme();
  const unit = useCanvasUnit();
  return <div style={{boxSizing: "border-box", borderRadius: theme.radius * unit, color: theme.ink, background: theme.surface, boxShadow: "0 18px 60px rgba(0,0,0,0.24)", ...style}}>{children}</div>;
};

const TemplateTitle: React.FC<{children: string; style?: React.CSSProperties}> = ({children, style}) => {
  const theme = useMotionTheme();
  return <TextFit maxSize={48} minSize={30} maxCharacters={28} style={{color: theme.ink, fontWeight: 690, letterSpacing: "-0.025em", lineHeight: 1.08, ...style}}>{children}</TextFit>;
};

const useDrawProgress = (start = 8, end = 72): number => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  return interpolate(frame, [start * fps / 30, end * fps / 30], [0, 1], {extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.bezier(0.16, 1, 0.3, 1)});
};

export const DualMetric: React.FC<DualMetricProps> = (props) => {
  const unit = useCanvasUnit();
  const difference = props.valueA - props.valueB;
  return <TemplateFrame preset={props.stylePreset} accent={props.accentColor}><EntranceExit style={{position: "absolute", left: 0, right: 0, bottom: 0}}><Panel style={{padding: `${52 * unit}px ${60 * unit}px`}}><TemplateTitle>{props.title}</TemplateTitle><div style={{display: "grid", gridTemplateColumns: "1fr auto 1fr", alignItems: "end", gap: 40 * unit, marginTop: 48 * unit}}><Metric label={props.labelA} value={props.valueA} unit={props.unit} accent /><div style={{width: 1, height: 116 * unit, background: "rgba(255,255,255,0.18)"}} /><Metric label={props.labelB} value={props.valueB} unit={props.unit} /></div><div style={{display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 42 * unit}}><Difference value={difference} unit={props.unit} /><SourceFooter source={props.source} /></div></Panel></EntranceExit></TemplateFrame>;
};

const Metric: React.FC<{label: string; value: number; unit: string; accent?: boolean}> = ({label, value, unit, accent}) => {
  const theme = useMotionTheme(); const unitScale = useCanvasUnit();
  return <div><div style={{color: theme.muted, fontSize: 25 * unitScale, marginBottom: 10 * unitScale}}>{label}</div><div style={{color: accent ? theme.accent : theme.ink, fontSize: 104 * unitScale, fontWeight: 750, lineHeight: 1, letterSpacing: "-0.045em", fontVariantNumeric: "tabular-nums"}}><AnimatedNumber value={value} decimals={1} /><span style={{fontSize: 30 * unitScale, marginLeft: 10 * unitScale, fontWeight: 560}}>{unit}</span></div></div>;
};

const Difference: React.FC<{value: number; unit: string}> = ({value, unit}) => {
  const theme = useMotionTheme(); const scale = useCanvasUnit();
  return <span style={{padding: `${8 * scale}px ${13 * scale}px`, borderRadius: 999, color: theme.accent, background: `${theme.accent}20`, fontSize: 22 * scale, fontWeight: 650}}>差值 {value >= 0 ? "+" : ""}{value.toFixed(1)} {unit}</span>;
};

export const HorizontalRanking: React.FC<HorizontalRankingProps> = (props) => {
  const frame = useCurrentFrame(); const {durationInFrames} = useVideoConfig(); const unit = useCanvasUnit(); const theme = useResolvedMotionTheme(props.stylePreset, props.accentColor);
  const items = props.sortDirection === "descending" ? [...props.items].sort((a, b) => b.value - a.value) : props.items;
  const pagination = getPagination(frame, durationInFrames, items.length, 5);
  const pageItems = items.slice(pagination.page * 5, pagination.page * 5 + 5);
  const maximum = Math.max(1, ...items.map((item) => Math.abs(item.value)));
  const draw = useDrawProgress(6, 58);
  return <TemplateFrame preset={props.stylePreset} accent={props.accentColor}><EntranceExit style={{position: "absolute", inset: 0}}><Panel style={{height: "100%", padding: `${48 * unit}px ${58 * unit}px`, display: "flex", flexDirection: "column"}}><div style={{display: "flex", justifyContent: "space-between", alignItems: "baseline"}}><TemplateTitle>{props.title}</TemplateTitle><span style={{color: theme.muted, fontSize: 20 * unit}}>{pagination.page + 1} / {pagination.pageCount}</span></div><div style={{display: "grid", gap: 20 * unit, flex: 1, alignContent: "center", marginTop: 24 * unit}}>{pageItems.map((item, index) => <StaggerGroup key={`${item.label}-${index}`} index={index}><div style={{display: "grid", gridTemplateColumns: `${60 * unit}px ${160 * unit}px 1fr ${100 * unit}px`, alignItems: "center", gap: 18 * unit}}><span style={{color: theme.muted, fontSize: 22 * unit, fontFamily: "SF Mono, monospace"}}>{String(pagination.page * 5 + index + 1).padStart(2, "0")}</span><span style={{fontSize: 27 * unit, fontWeight: 620, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap"}}>{item.label}</span><div style={{height: 24 * unit, borderRadius: 6 * unit, background: theme.grid}}><BarMark progress={Math.abs(item.value) / maximum * draw} color={props.stylePreset === "minimal" ? theme.ink : item.color} /></div><strong style={{fontSize: 27 * unit, fontVariantNumeric: "tabular-nums", textAlign: "right"}}>{item.value.toLocaleString("zh-CN")}</strong></div></StaggerGroup>)}</div><SourceFooter source={props.source} /></Panel></EntranceExit></TemplateFrame>;
};

export const VerticalBars: React.FC<VerticalBarsProps> = (props) => {
  const unit = useCanvasUnit(); const theme = useResolvedMotionTheme(props.stylePreset, props.accentColor); const draw = useDrawProgress();
  const maximum = Math.max(1, ...props.items.map((item) => Math.abs(item.value)));
  return <TemplateFrame preset={props.stylePreset} accent={props.accentColor}><EntranceExit style={{position: "absolute", inset: 0}}><Panel style={{height: "100%", padding: `${45 * unit}px ${56 * unit}px`, display: "grid", gridTemplateRows: "auto 1fr auto", gap: 26 * unit}}><TemplateTitle>{props.title}</TemplateTitle><div style={{position: "relative", minHeight: 0, paddingTop: 30 * unit}}>{props.showAxis && <GridLines count={5} />}<div style={{position: "absolute", inset: `${18 * unit}px 0 0`, display: "flex", alignItems: "flex-end", justifyContent: "space-around", gap: 20 * unit}}>{props.items.map((item, index) => <StaggerGroup key={`${item.label}-${index}`} index={index} style={{height: "100%", flex: 1, display: "flex", flexDirection: "column", justifyContent: "flex-end", alignItems: "stretch"}}><strong style={{color: theme.ink, fontSize: 22 * unit, marginBottom: 8 * unit, textAlign: "center"}}>{item.value}</strong><div style={{height: `${Math.max(0.02, Math.abs(item.value) / maximum * draw) * 80}%`, minHeight: 2, display: "flex", alignItems: "flex-end"}}><BarMark direction="vertical" progress={1} color={props.stylePreset === "minimal" ? theme.ink : item.color} /></div><span style={{color: theme.muted, fontSize: 20 * unit, marginTop: 10 * unit, textAlign: "center", whiteSpace: "nowrap"}}>{item.label}</span></StaggerGroup>)}</div></div><SourceFooter source={props.source} /></Panel></EntranceExit></TemplateFrame>;
};

export const LineTrend: React.FC<LineTrendProps> = (props) => {
  const unit = useCanvasUnit(); const theme = useResolvedMotionTheme(props.stylePreset, props.accentColor); const progress = useDrawProgress();
  const values = props.items.map((item) => item.value); const min = Math.min(...values); const max = Math.max(...values); const range = Math.max(1, max - min);
  const points: Point[] = props.items.map((item, index) => ({x: 50 + index * 1100 / Math.max(1, props.items.length - 1), y: 500 - (item.value - min) / range * 410}));
  return <TemplateFrame preset={props.stylePreset} accent={props.accentColor}><EntranceExit style={{position: "absolute", inset: 0}}><Panel style={{height: "100%", padding: `${44 * unit}px ${56 * unit}px`, display: "grid", gridTemplateRows: "auto 1fr auto", gap: 22 * unit}}><TemplateTitle>{props.title}</TemplateTitle><div style={{position: "relative", minHeight: 0}}><svg viewBox="0 0 1200 560" style={{width: "100%", height: "100%", overflow: "visible"}}><g opacity={0.8}><line x1="50" x2="1150" y1="500" y2="500" stroke={theme.grid} strokeWidth="2" />{[0,1,2,3,4].map((index) => <line key={index} x1="50" x2="1150" y1={90 + index * 102.5} y2={90 + index * 102.5} stroke={theme.grid} strokeWidth="1" />)}</g><LinePath points={points} progress={progress} strokeWidth={props.stylePreset === "vibrant" ? 9 : 6} />{props.showPoints && points.map((point, index) => <g key={index} opacity={progress >= index / points.length ? 1 : 0}><circle cx={point.x} cy={point.y} r={index === points.length - 1 ? 13 : 8} fill={theme.surface} stroke={index === points.length - 1 ? theme.accent : theme.ink} strokeWidth="5" /><text x={point.x} y={point.y - 24} textAnchor="middle" fill={theme.ink} fontSize="26" fontWeight="650">{props.items[index]?.value}</text></g>)}</svg><div style={{position: "absolute", left: `${50 / 12}%`, right: `${50 / 12}%`, bottom: 0}}><Axis labels={props.items.map((item) => item.label)} /></div></div><SourceFooter source={props.source} /></Panel></EntranceExit></TemplateFrame>;
};

export const DonutShare: React.FC<DonutShareProps> = (props) => {
  const unit = useCanvasUnit(); const theme = useResolvedMotionTheme(props.stylePreset, props.accentColor); const progress = useDrawProgress(6, 66); const total = Math.max(1, props.items.reduce((sum, item) => sum + Math.max(0, item.value), 0));
  let angle = 0;
  const arcs = props.items.map((item) => {const start = angle; angle += Math.max(0, item.value) / total * Math.PI * 2 * progress; return {...item, start, end: angle};});
  return <TemplateFrame preset={props.stylePreset} accent={props.accentColor}><EntranceExit style={{position: "absolute", inset: 0}}><Panel style={{height: "100%", padding: `${44 * unit}px ${56 * unit}px`, display: "grid", gridTemplateColumns: "1.15fr 0.85fr", gap: 60 * unit, alignItems: "center"}}><div><TemplateTitle>{props.title}</TemplateTitle><svg viewBox="0 0 560 560" style={{width: "100%", maxHeight: 560 * unit}}>{arcs.map((item, index) => <DonutArc key={`${item.label}-${index}`} cx={280} cy={280} outer={230} inner={145} startAngle={item.start} endAngle={Math.max(item.start + 0.002, item.end)} color={props.stylePreset === "minimal" && index > 0 ? `rgba(255,255,255,${Math.max(0.18, 0.7 - index * 0.12)})` : item.color} />)}<text x="280" y="270" textAnchor="middle" fill={theme.ink} fontSize="54" fontWeight="740">{props.centerLabel}</text><text x="280" y="318" textAnchor="middle" fill={theme.muted} fontSize="26">{total.toLocaleString("zh-CN")} total</text></svg></div><div style={{display: "flex", flexDirection: "column", justifyContent: "center", gap: 22 * unit}}>{props.items.map((item, index) => <StaggerGroup key={`${item.label}-${index}`} index={index}><DataLabel label={item.label} value={`${(item.value / total * 100).toFixed(1)}%`} style={{paddingBottom: 12 * unit, borderBottom: `1px solid ${theme.grid}`}} /></StaggerGroup>)}<Legend items={props.items.map((item) => ({label: item.label, color: item.color}))} /><SourceFooter source={props.source} style={{marginTop: 20 * unit}} /></div></Panel></EntranceExit></TemplateFrame>;
};

export const SourceCard: React.FC<SourceCardProps> = (props) => {
  const unit = useCanvasUnit(); const theme = useResolvedMotionTheme(props.stylePreset, props.accentColor);
  return <TemplateFrame preset={props.stylePreset} accent={props.accentColor}><EntranceExit style={{position: "absolute", left: 0, right: 0, bottom: 0}}><Panel style={{padding: `${55 * unit}px ${62 * unit}px`, borderLeft: `${10 * unit}px solid ${theme.accent}`}}><RevealText style={{color: theme.accent, fontSize: 20 * unit, fontWeight: 760, letterSpacing: "0.12em"}}>SOURCE / REFERENCE</RevealText><TemplateTitle style={{marginTop: 18 * unit, maxWidth: "88%"}}>{props.title}</TemplateTitle><p style={{maxWidth: "88%", margin: `${24 * unit}px 0 ${38 * unit}px`, color: theme.muted, fontSize: 28 * unit, lineHeight: 1.5}}>{props.summary}</p><div style={{display: "flex", gap: 38 * unit, color: theme.ink, fontSize: 22 * unit}}><span>{props.author}</span><span>{props.organization}</span><span style={{color: theme.muted}}>{props.date}</span></div>{props.displayMode === "full" && <TextFit maxSize={18} minSize={12} maxCharacters={120} style={{marginTop: 18 * unit, color: theme.muted}}>{[props.source, props.url, props.accessDate ? `访问 ${props.accessDate}` : ""].filter(Boolean).join(" · ")}</TextFit>}<SourceFooter source={props.displayMode === "short" ? (props.organization || props.source) : props.source} style={{marginTop: 20 * unit}} /></Panel></EntranceExit></TemplateFrame>;
};

export const QuoteCard: React.FC<QuoteCardProps> = (props) => {
  const unit = useCanvasUnit(); const theme = useResolvedMotionTheme(props.stylePreset, props.accentColor);
  return <TemplateFrame preset={props.stylePreset} accent={props.accentColor}><EntranceExit style={{position: "absolute", inset: 0}}><Panel style={{height: "100%", padding: `${62 * unit}px ${70 * unit}px`, display: "grid", gridTemplateColumns: props.avatarAssetId ? "1fr 240px" : "1fr", gap: 55 * unit, alignItems: "center"}}><div><span style={{display: "block", height: 8 * unit, width: 100 * unit, borderRadius: 8, background: theme.accent, marginBottom: 36 * unit}} /><TextFit maxSize={57} minSize={34} maxCharacters={58} style={{fontWeight: 650, lineHeight: 1.38, letterSpacing: "-0.025em"}}>{`“${props.quote}”`}</TextFit><div style={{marginTop: 42 * unit}}><strong style={{fontSize: 28 * unit}}>{props.person}</strong><span style={{display: "block", marginTop: 8 * unit, color: theme.muted, fontSize: 22 * unit}}>{props.role}</span></div></div>{props.avatarAssetId && <div style={{width: 230 * unit, height: 230 * unit, overflow: "hidden", borderRadius: props.stylePreset === "minimal" ? 8 : 999, border: `${5 * unit}px solid ${theme.accent}`}}><MediaSlot assetId={props.avatarAssetId} /></div>}</Panel></EntranceExit></TemplateFrame>;
};

export const Timeline: React.FC<TimelineProps> = (props) => {
  const frame = useCurrentFrame(); const {durationInFrames} = useVideoConfig(); const unit = useCanvasUnit(); const theme = useResolvedMotionTheme(props.stylePreset, props.accentColor); const pagination = getPagination(frame, durationInFrames, props.items.length, 4); const items = props.items.slice(pagination.page * 4, pagination.page * 4 + 4);
  return <TemplateFrame preset={props.stylePreset} accent={props.accentColor}><EntranceExit style={{position: "absolute", inset: 0}}><Panel style={{height: "100%", padding: `${45 * unit}px ${56 * unit}px`, display: "grid", gridTemplateRows: "auto 1fr auto", gap: 30 * unit}}><div style={{display: "flex", justifyContent: "space-between"}}><TemplateTitle>{props.title}</TemplateTitle><span style={{color: theme.muted, fontSize: 20 * unit}}>{pagination.page + 1} / {pagination.pageCount}</span></div><div style={{display: "grid", gridTemplateColumns: `repeat(${items.length}, 1fr)`, gap: 26 * unit, alignItems: "center", position: "relative"}}><span style={{position: "absolute", left: 0, right: 0, top: "43%", height: 2 * unit, background: theme.grid}} />{items.map((item, index) => <StaggerGroup index={index} key={`${item.date}-${item.title}`} style={{position: "relative"}}><div style={{minHeight: 230 * unit, padding: `${28 * unit}px ${24 * unit}px`, borderRadius: theme.radius * unit, background: theme.surfaceSoft, border: `1px solid ${index === items.length - 1 ? theme.accent : theme.grid}`}}><span style={{color: theme.accent, fontFamily: "SF Mono, monospace", fontSize: 22 * unit, fontWeight: 700}}>{item.date}</span><h3 style={{margin: `${50 * unit}px 0 ${12 * unit}px`, fontSize: 28 * unit, lineHeight: 1.2}}>{item.title}</h3><p style={{margin: 0, color: theme.muted, fontSize: 20 * unit, lineHeight: 1.4}}>{item.description}</p></div></StaggerGroup>)}</div><SourceFooter source={props.source} /></Panel></EntranceExit></TemplateFrame>;
};

export const LowerThird: React.FC<LowerThirdProps> = (props) => {
  const unit = useCanvasUnit(); const theme = useResolvedMotionTheme(props.stylePreset, props.accentColor); const alignRight = props.position === "right";
  return <TemplateFrame preset={props.stylePreset} accent={props.accentColor} inset={0.05}><EntranceExit direction={alignRight ? "right" : "left"} style={{position: "absolute", bottom: 0, [alignRight ? "right" : "left"]: 0, display: "flex", flexDirection: alignRight ? "row-reverse" : "row", alignItems: "stretch"}}>{props.logoAssetId && <div style={{width: 150 * unit, minHeight: 140 * unit, padding: 22 * unit, background: theme.accent}}><MediaSlot assetId={props.logoAssetId} fit="contain" /></div>}<Panel style={{minWidth: 650 * unit, padding: `${30 * unit}px ${42 * unit}px`, borderRadius: 0, borderBottom: `${8 * unit}px solid ${theme.accent}`, textAlign: alignRight ? "right" : "left"}}><TextFit maxSize={48} minSize={34} maxCharacters={22} style={{fontWeight: 720}}>{props.title}</TextFit><div style={{marginTop: 9 * unit, color: theme.muted, fontSize: 25 * unit}}>{props.subtitle}</div></Panel></EntranceExit></TemplateFrame>;
};

export const MediaInfo: React.FC<MediaInfoProps> = (props) => {
  const unit = useCanvasUnit(); const theme = useResolvedMotionTheme(props.stylePreset, props.accentColor); const full = props.layout === "media-full"; const reverse = props.layout === "media-right"; const mediaProps = {fit: props.mediaFit, focalX: props.focalX, focalY: props.focalY, scale: props.mediaScale, radius: props.mediaRadius * unit, inSeconds: props.videoInSeconds, outSeconds: props.videoOutSeconds, playbackRate: props.playbackRate, playbackMode: props.playbackMode};
  return <TemplateFrame preset={props.stylePreset} accent={props.accentColor}><EntranceExit style={{position: "absolute", inset: 0}}><Panel style={{height: "100%", overflow: "hidden", position: "relative", display: full ? "block" : "grid", gridTemplateColumns: "1.05fr 0.95fr"}}>{full && <MediaSlot assetId={props.assetId} {...mediaProps} style={{position: "absolute", inset: 0}} />}{full && <div style={{position: "absolute", inset: 0, background: "linear-gradient(90deg, rgba(4,8,12,0.93), rgba(4,8,12,0.28) 70%)"}} />}{!full && <div style={{gridColumn: reverse ? 2 : 1, gridRow: 1, overflow: "hidden"}}><MediaSlot assetId={props.assetId} {...mediaProps} /></div>}<div style={{position: full ? "absolute" : "relative", zIndex: 2, left: full ? 0 : undefined, bottom: full ? 0 : undefined, width: full ? "64%" : undefined, gridColumn: reverse ? 1 : 2, gridRow: 1, padding: `${55 * unit}px ${58 * unit}px`, display: "flex", flexDirection: "column", justifyContent: "center"}}><span style={{width: 72 * unit, height: 7 * unit, borderRadius: 8, background: theme.accent, marginBottom: 28 * unit}} /><TemplateTitle>{props.title}</TemplateTitle><p style={{margin: `${24 * unit}px 0 ${38 * unit}px`, color: theme.muted, fontSize: 26 * unit, lineHeight: 1.5}}>{props.body}</p><SourceFooter source={props.source} /></div></Panel></EntranceExit></TemplateFrame>;
};

export const MediaGrid: React.FC<MediaGridProps> = (props) => {
  const unit = useCanvasUnit(); const theme = useResolvedMotionTheme(props.stylePreset, props.accentColor); const slots = [{asset: props.asset1, label: props.label1}, {asset: props.asset2, label: props.label2}, {asset: props.asset3, label: props.label3}, {asset: props.asset4, label: props.label4}].slice(0, props.gridCount);
  const columns = props.gridCount === 2 ? 2 : props.gridCount === 3 ? 3 : 2;
  return <TemplateFrame preset={props.stylePreset} accent={props.accentColor}><EntranceExit style={{position: "absolute", inset: 0}}><div style={{height: "100%", display: "grid", gridTemplateRows: "auto 1fr", gap: 24 * unit}}>{props.title && <TemplateTitle>{props.title}</TemplateTitle>}<div style={{display: "grid", gridTemplateColumns: `repeat(${columns}, 1fr)`, gridTemplateRows: props.gridCount === 4 ? "repeat(2, 1fr)" : "1fr", gap: 12 * unit}}>{slots.map((slot, index) => <StaggerGroup index={index} key={index} style={{height: "100%", minHeight: 0}}><Panel style={{height: "100%", overflow: "hidden", position: "relative", border: `1px solid ${theme.grid}`}}><MediaSlot assetId={slot.asset} /><span style={{position: "absolute", left: 16 * unit, bottom: 16 * unit, padding: `${7 * unit}px ${12 * unit}px`, borderRadius: 4 * unit, color: theme.ink, background: theme.surface, borderLeft: `${4 * unit}px solid ${theme.accent}`, fontSize: 21 * unit, fontWeight: 620}}>{slot.label}</span></Panel></StaggerGroup>)}</div></div></EntranceExit></TemplateFrame>;
};

export const getTemplateProgressForTesting = (frame: number, durationInFrames: number): number => getNormalizedProgress(frame, durationInFrames);
