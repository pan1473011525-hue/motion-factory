import {useState} from "react";
import type {
  ComposerEasingPresetId,
  ComposerMotionPresetId,
  ComposerNode,
  ProjectAsset,
} from "../../../packages/project-model/src";
import type {InspectorField, InspectorSection} from "../../../packages/template-sdk/src";
import {Eye, EyeOff, Lock, LockOpen, RotateCcw, X} from "lucide-react";
import {composerEasingPresets, getComposerEasingFunction, getComposerEasingPreset} from "../../composer/easing";
import {composerComponentSupportsContentEasing, getComposerComponent, motionPresets} from "../../composer/registry";
import {FieldControl} from "./Inspector";
import {InspectorGroup} from "./InspectorGroup";
import {CompactPairControl, CompactPropertyRow, RangeNumberControl} from "./PropertyControls";
import {Select} from "./Select";

const sectionLabels: Record<InspectorSection, string> = {
  content: "内容",
  data: "数据 / 素材",
  source: "来源",
  style: "样式",
  animation: "播放",
  layout: "布局",
};

const orderedSections: InspectorSection[] = ["content", "data", "source", "layout", "style", "animation"];
const clamp = (value: number, minimum: number, maximum: number): number => Math.min(maximum, Math.max(minimum, value));
const percent = (value: number): number => Number((value * 100).toFixed(2));
export type ComposerInspectorView = "basic" | "motion";

const MotionSelect: React.FC<{
  label: string;
  phase: "enter" | "exit" | "loop";
  value: ComposerMotionPresetId;
  onChange: (value: ComposerMotionPresetId) => void;
}> = ({label, phase, value, onChange}) => <label className="field"><span>{label}</span><Select ariaLabel={label} value={value} options={motionPresets.filter((preset) => preset.phases.includes(phase)).map((preset) => ({value: preset.id, label: preset.name}))} onChange={(nextValue) => onChange(nextValue as ComposerMotionPresetId)} /></label>;

const curvePath = (presetId: ComposerEasingPresetId): string => {
  const easing = getComposerEasingFunction(presetId);
  return Array.from({length: 41}, (_, index) => {
    const progress = index / 40;
    const value = clamp(easing(progress), -0.15, 1.15);
    const x = 5 + progress * 102;
    const y = 37 - (value + 0.15) / 1.3 * 32;
    return `${index === 0 ? "M" : "L"}${x.toFixed(2)} ${y.toFixed(2)}`;
  }).join(" ");
};

const EasingCurveControl: React.FC<{
  label: string;
  value: ComposerEasingPresetId;
  onChange: (value: ComposerEasingPresetId) => void;
}> = ({label, value, onChange}) => {
  const preset = getComposerEasingPreset(value);
  return <div className="easing-curve-control">
    <label><span>{label}</span><Select ariaLabel={label} value={value} options={composerEasingPresets.map((candidate) => ({value: candidate.id, label: candidate.name}))} onChange={(nextValue) => onChange(nextValue as ComposerEasingPresetId)} /></label>
    <div className="easing-curve-summary" title={preset.description}>
      <svg viewBox="0 0 112 42" role="img" aria-label={`${preset.name}曲线预览`}>
        <path className="easing-curve-guide" d="M5 33.31 H107 M5 8.69 H107" />
        <path className="easing-curve-line" d={curvePath(value)} />
      </svg>
      <small>{preset.description}</small>
    </div>
  </div>;
};

export const ComposerInspector: React.FC<{
  node: ComposerNode | null;
  assets: ProjectAsset[];
  projectDurationInFrames: number;
  view: ComposerInspectorView;
  onViewChange: (view: ComposerInspectorView) => void;
  onChange: (node: ComposerNode) => void;
  onPickMedia: (field: Extract<InspectorField, {control: "media"}>) => Promise<void>;
}> = ({node, assets, projectDurationInFrames, view, onViewChange, onChange, onPickMedia}) => {
  const [sizeLinked, setSizeLinked] = useState(true);
  const tabs = <div className="composer-inspector-tabs" role="tablist" aria-label="图层设置类型"><button type="button" role="tab" aria-selected={view === "basic"} className={view === "basic" ? "active" : ""} onClick={() => onViewChange("basic")}>基础设置</button><button type="button" role="tab" aria-selected={view === "motion"} className={view === "motion" ? "active" : ""} onClick={() => onViewChange("motion")}>动效设置</button></div>;
  if (!node) return <>{tabs}<div className="composer-inspector-empty"><strong>没有选中图层</strong><span>从组件库添加组件，或在画布和时间轴中选择一个图层。</span></div></>;
  const definition = getComposerComponent(node.componentId);
  const updateTransform = (patch: Partial<ComposerNode["transform"]>): void => onChange({...node, transform: {...node.transform, ...patch}});
  const updateTiming = (patch: Partial<ComposerNode["timing"]>): void => onChange({...node, timing: {...node.timing, ...patch}});
  const updateMotion = (patch: Partial<ComposerNode["motion"]>): void => onChange({...node, motion: {...node.motion, ...patch}});
  const updateProp = (key: string, value: unknown): void => onChange({...node, props: {...node.props, [key]: value}});
  const mix = node.motion.mix ?? {enter: 1, exit: 1, loop: 1};
  const supportsContentEasing = composerComponentSupportsContentEasing(node.componentId);

  return <>{tabs}{view === "basic" ? <>
    <InspectorGroup title="图层" defaultOpen className="node-identity-editor">
      <label className="field"><span>图层名称</span><input value={node.name} maxLength={96} onChange={(event) => onChange({...node, name: event.target.value || definition.name})} /></label>
      <div className="node-state-actions"><button type="button" className={`icon-btn ${node.hidden ? "active" : ""}`} onClick={() => onChange({...node, hidden: !node.hidden})} title={node.hidden ? "显示图层" : "隐藏图层"}>{node.hidden ? <EyeOff /> : <Eye />}{node.hidden ? "已隐藏" : "可见"}</button><button type="button" className={`icon-btn ${node.locked ? "active" : ""}`} onClick={() => onChange({...node, locked: !node.locked})} title={node.locked ? "解锁图层" : "锁定图层"}>{node.locked ? <Lock /> : <LockOpen />}{node.locked ? "已锁定" : "可编辑"}</button></div>
    </InspectorGroup>
    <InspectorGroup title="变换" defaultOpen className="transform-editor compact-transform-editor">
      <CompactPairControl label="位置（%）" firstLabel="X" secondLabel="Y" firstValue={percent(node.transform.x)} secondValue={percent(node.transform.y)} min={-200} max={300} step={0.1} onFirstChange={(value) => updateTransform({x: value / 100})} onSecondChange={(value) => updateTransform({y: value / 100})} />
      <CompactPairControl label="尺寸（%）" firstLabel="宽" secondLabel="高" firstValue={percent(node.transform.width)} secondValue={percent(node.transform.height)} min={1} max={300} step={0.1} linked={sizeLinked} onLinkedChange={setSizeLinked} onFirstChange={(value) => updateTransform({width: value / 100, ...(sizeLinked ? {height: clamp(node.transform.height * (value / 100) / node.transform.width, 0.01, 3)} : {})})} onSecondChange={(value) => updateTransform({height: value / 100, ...(sizeLinked ? {width: clamp(node.transform.width * (value / 100) / node.transform.height, 0.01, 3)} : {})})} />
      <CompactPropertyRow label="旋转（°）"><RangeNumberControl ariaLabel="旋转" value={node.transform.rotation} min={-360} max={360} step={0.5} resetValue={0} onChange={(rotation) => updateTransform({rotation})} /></CompactPropertyRow>
      <CompactPropertyRow label="透明度"><RangeNumberControl ariaLabel="透明度" value={Math.round(node.transform.opacity * 100)} min={0} max={100} step={1} resetValue={100} onChange={(opacity) => updateTransform({opacity: opacity / 100})} /></CompactPropertyRow>
    </InspectorGroup>
    {orderedSections.map((section) => {
      const fields = definition.fields.filter((field) => field.section === section);
      if (fields.length === 0) return null;
      return <InspectorGroup title={sectionLabels[section]} key={section} defaultOpen>{fields.map((field) => <label className={`field field-${field.control}`} key={field.key}><span>{field.label}</span><FieldControl field={field} value={node.props[field.key]} defaultValue={definition.defaultProps[field.key]} assets={assets} onChange={(value) => updateProp(field.key, value)} onPickMedia={() => onPickMedia(field as Extract<InspectorField, {control: "media"}>)} />{field.help && <small className="field-help">{field.help}</small>}</label>)}</InspectorGroup>;
    })}
    <InspectorGroup title="时间" className="timing-editor">
      <CompactPropertyRow label="开始帧"><RangeNumberControl ariaLabel="开始帧" value={node.timing.from} min={0} max={Math.max(0, projectDurationInFrames - 1)} resetValue={0} onChange={(from) => updateTiming({from, durationInFrames: Math.min(node.timing.durationInFrames, projectDurationInFrames - from)})} /></CompactPropertyRow>
      <CompactPropertyRow label="持续帧" help={`结束于第 ${node.timing.from + node.timing.durationInFrames - 1} 帧`}><RangeNumberControl ariaLabel="持续帧" value={node.timing.durationInFrames} min={1} max={Math.max(1, projectDurationInFrames - node.timing.from)} resetValue={Math.max(1, projectDurationInFrames - node.timing.from)} onChange={(durationInFrames) => updateTiming({durationInFrames})} /></CompactPropertyRow>
    </InspectorGroup>
    {node.componentId === "template" && <InspectorGroup title="模板快照" className="template-node-summary"><dl><div><dt>模板</dt><dd>{String(node.props.templateId ?? "")}</dd></div><div><dt>参数</dt><dd>{Object.keys((node.props.templateProps as Record<string, unknown>) ?? {}).length} 项</dd></div></dl><small className="field-help">模板在转换时被冻结为参数快照。可继续移动、缩放、定时和添加动效。</small></InspectorGroup>}
  </> : <>
    <InspectorGroup title="整体动效" defaultOpen className="node-motion-editor">
      <CompactPropertyRow label="整体强度"><RangeNumberControl ariaLabel="整体强度" value={node.motion.intensity} min={0} max={2} step={0.05} resetValue={1} onChange={(intensity) => updateMotion({intensity})} /></CompactPropertyRow>
      {supportsContentEasing && <EasingCurveControl label="内容曲线" value={node.motion.contentEasing} onChange={(contentEasing) => updateMotion({contentEasing})} />}
    </InspectorGroup>
    <InspectorGroup title="入场动效" defaultOpen className="node-motion-editor phase-motion-editor">
      <MotionSelect label="动效" phase="enter" value={node.motion.enter} onChange={(enter) => updateMotion({enter, ...(enter === "pop" && !node.motion.enterEasing.startsWith("spring-") ? {enterEasing: "spring-snappy"} : {})})} />
      <EasingCurveControl label="入场曲线" value={node.motion.enterEasing} onChange={(enterEasing) => updateMotion({enterEasing})} />
      <CompactPropertyRow label="入场帧数"><RangeNumberControl ariaLabel="入场帧数" value={node.motion.enterDuration} min={1} max={Math.max(1, node.timing.durationInFrames)} resetValue={15} onChange={(enterDuration) => updateMotion({enterDuration})} /></CompactPropertyRow>
      <CompactPropertyRow label="入场强度"><RangeNumberControl ariaLabel="入场强度" value={Math.round(mix.enter * 100)} min={0} max={100} resetValue={100} onChange={(enter) => updateMotion({mix: {...mix, enter: enter / 100}})} /></CompactPropertyRow>
      <div className="phase-motion-actions"><button type="button" className="motion-reset-action" onClick={() => updateMotion({enter: "fade", enterDuration: 15, enterEasing: "smooth-out", mix: {...mix, enter: 1}})} title="重置入场动效" aria-label="重置入场动效"><RotateCcw />重置</button><button type="button" className="motion-clear-action" onClick={() => updateMotion({enter: "none"})} title="清除入场动效" aria-label="清除入场动效"><X />清除</button></div>
    </InspectorGroup>
    <InspectorGroup title="持续动效" defaultOpen className="node-motion-editor phase-motion-editor">
      <MotionSelect label="动效" phase="loop" value={node.motion.loop} onChange={(loop) => updateMotion({loop})} />
      <CompactPropertyRow label="持续强度"><RangeNumberControl ariaLabel="持续强度" value={Math.round(mix.loop * 100)} min={0} max={100} resetValue={100} onChange={(loop) => updateMotion({mix: {...mix, loop: loop / 100}})} /></CompactPropertyRow>
      <div className="phase-motion-actions"><button type="button" className="motion-reset-action" onClick={() => updateMotion({loop: "none", mix: {...mix, loop: 1}})} title="重置持续动效" aria-label="重置持续动效"><RotateCcw />重置</button><button type="button" className="motion-clear-action" onClick={() => updateMotion({loop: "none"})} title="清除持续动效" aria-label="清除持续动效"><X />清除</button></div>
    </InspectorGroup>
    <InspectorGroup title="退场动效" defaultOpen className="node-motion-editor phase-motion-editor">
      <MotionSelect label="动效" phase="exit" value={node.motion.exit} onChange={(exit) => updateMotion({exit, ...(exit === "pop" && !node.motion.exitEasing.startsWith("spring-") ? {exitEasing: "spring-smooth"} : {})})} />
      <EasingCurveControl label="退场曲线" value={node.motion.exitEasing} onChange={(exitEasing) => updateMotion({exitEasing})} />
      <CompactPropertyRow label="退场帧数"><RangeNumberControl ariaLabel="退场帧数" value={node.motion.exitDuration} min={1} max={Math.max(1, node.timing.durationInFrames)} resetValue={15} onChange={(exitDuration) => updateMotion({exitDuration})} /></CompactPropertyRow>
      <CompactPropertyRow label="退场强度"><RangeNumberControl ariaLabel="退场强度" value={Math.round(mix.exit * 100)} min={0} max={100} resetValue={100} onChange={(exit) => updateMotion({mix: {...mix, exit: exit / 100}})} /></CompactPropertyRow>
      <div className="phase-motion-actions"><button type="button" className="motion-reset-action" onClick={() => updateMotion({exit: "fade", exitDuration: 15, exitEasing: "smooth-in", mix: {...mix, exit: 1}})} title="重置退场动效" aria-label="重置退场动效"><RotateCcw />重置</button><button type="button" className="motion-clear-action" onClick={() => updateMotion({exit: "none"})} title="清除退场动效" aria-label="清除退场动效"><X />清除</button></div>
    </InspectorGroup>
  </>}</>;
};
