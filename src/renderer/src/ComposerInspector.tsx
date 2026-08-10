import type {
  ComposerMotionPresetId,
  ComposerNode,
  ProjectAsset,
} from "../../../packages/project-model/src";
import type {InspectorField, InspectorSection} from "../../../packages/template-sdk/src";
import {getComposerComponent, motionPresets} from "../../composer/registry";
import {FieldControl} from "./Inspector";

const sectionLabels: Record<InspectorSection, string> = {
  content: "内容",
  data: "数据 / 素材",
  source: "来源",
  style: "样式",
  animation: "播放",
  layout: "布局",
};

const orderedSections: InspectorSection[] = ["content", "data", "source", "style", "animation", "layout"];
const clamp = (value: number, minimum: number, maximum: number): number => Math.min(maximum, Math.max(minimum, value));
const percent = (value: number): number => Number((value * 100).toFixed(2));

const MotionSelect: React.FC<{
  label: string;
  phase: "enter" | "exit" | "loop";
  value: ComposerMotionPresetId;
  onChange: (value: ComposerMotionPresetId) => void;
}> = ({label, phase, value, onChange}) => <label className="field"><span>{label}</span><select value={value} onChange={(event) => onChange(event.target.value as ComposerMotionPresetId)}>{motionPresets.filter((preset) => preset.phases.includes(phase)).map((preset) => <option value={preset.id} key={preset.id}>{preset.name}</option>)}</select></label>;

export const ComposerInspector: React.FC<{
  node: ComposerNode | null;
  assets: ProjectAsset[];
  projectDurationInFrames: number;
  onChange: (node: ComposerNode) => void;
  onPickMedia: (field: Extract<InspectorField, {control: "media"}>) => Promise<void>;
}> = ({node, assets, projectDurationInFrames, onChange, onPickMedia}) => {
  if (!node) return <div className="composer-inspector-empty"><strong>没有选中图层</strong><span>从组件库添加组件，或在画布和时间轴中选择一个图层。</span></div>;
  const definition = getComposerComponent(node.componentId);
  const updateTransform = (patch: Partial<ComposerNode["transform"]>): void => onChange({...node, transform: {...node.transform, ...patch}});
  const updateTiming = (patch: Partial<ComposerNode["timing"]>): void => onChange({...node, timing: {...node.timing, ...patch}});
  const updateMotion = (patch: Partial<ComposerNode["motion"]>): void => onChange({...node, motion: {...node.motion, ...patch}});
  const updateProp = (key: string, value: unknown): void => onChange({...node, props: {...node.props, [key]: value}});

  return <>
    <section className="inspector-section node-identity-editor">
      <label className="field"><span>图层名称</span><input value={node.name} maxLength={96} onChange={(event) => onChange({...node, name: event.target.value || definition.name})} /></label>
      <div className="node-state-actions"><button type="button" className={node.hidden ? "active" : ""} onClick={() => onChange({...node, hidden: !node.hidden})}>{node.hidden ? "已隐藏" : "可见"}</button><button type="button" className={node.locked ? "active" : ""} onClick={() => onChange({...node, locked: !node.locked})}>{node.locked ? "已锁定" : "可编辑"}</button></div>
    </section>
    <section className="inspector-section transform-editor">
      <h3>变换</h3>
      <div className="field-row"><label className="field field-grow"><span>X %</span><input type="number" step={0.1} value={percent(node.transform.x)} onChange={(event) => updateTransform({x: clamp((event.target.valueAsNumber || 0) / 100, -2, 3)})} /></label><label className="field field-grow"><span>Y %</span><input type="number" step={0.1} value={percent(node.transform.y)} onChange={(event) => updateTransform({y: clamp((event.target.valueAsNumber || 0) / 100, -2, 3)})} /></label></div>
      <div className="field-row"><label className="field field-grow"><span>宽度 %</span><input type="number" min={1} max={300} step={0.1} value={percent(node.transform.width)} onChange={(event) => updateTransform({width: clamp((event.target.valueAsNumber || 1) / 100, 0.01, 3)})} /></label><label className="field field-grow"><span>高度 %</span><input type="number" min={1} max={300} step={0.1} value={percent(node.transform.height)} onChange={(event) => updateTransform({height: clamp((event.target.valueAsNumber || 1) / 100, 0.01, 3)})} /></label></div>
      <div className="field-row"><label className="field field-grow"><span>旋转</span><input type="number" step={0.5} value={node.transform.rotation} onChange={(event) => updateTransform({rotation: event.target.valueAsNumber || 0})} /></label><label className="field field-grow"><span>透明度 %</span><input type="number" min={0} max={100} step={1} value={Math.round(node.transform.opacity * 100)} onChange={(event) => updateTransform({opacity: clamp((event.target.valueAsNumber || 0) / 100, 0, 1)})} /></label></div>
    </section>
    {node.componentId === "template" && <section className="inspector-section template-node-summary"><h3>模板快照</h3><dl><div><dt>模板</dt><dd>{String(node.props.templateId ?? "")}</dd></div><div><dt>参数</dt><dd>{Object.keys((node.props.templateProps as Record<string, unknown>) ?? {}).length} 项</dd></div></dl><small className="field-help">模板在转换时被冻结为参数快照。可继续移动、缩放、定时和添加动效。</small></section>}
    {orderedSections.map((section) => {
      const fields = definition.fields.filter((field) => field.section === section);
      if (fields.length === 0) return null;
      return <section className="inspector-section" key={section}><h3>{sectionLabels[section]}</h3>{fields.map((field) => <label className={`field field-${field.control}`} key={field.key}><span>{field.label}</span><FieldControl field={field} value={node.props[field.key]} assets={assets} onChange={(value) => updateProp(field.key, value)} onPickMedia={() => onPickMedia(field as Extract<InspectorField, {control: "media"}>)} />{field.help && <small className="field-help">{field.help}</small>}</label>)}</section>;
    })}
    <section className="inspector-section timing-editor">
      <h3>时间</h3>
      <div className="field-row"><label className="field field-grow"><span>开始帧</span><input type="number" min={0} max={projectDurationInFrames - 1} value={node.timing.from} onChange={(event) => {const from = clamp(event.target.valueAsNumber || 0, 0, projectDurationInFrames - 1); updateTiming({from, durationInFrames: Math.min(node.timing.durationInFrames, projectDurationInFrames - from)});}} /></label><label className="field field-grow"><span>持续帧</span><input type="number" min={1} max={projectDurationInFrames - node.timing.from} value={node.timing.durationInFrames} onChange={(event) => updateTiming({durationInFrames: clamp(event.target.valueAsNumber || 1, 1, projectDurationInFrames - node.timing.from)})} /></label></div>
      <small className="field-help">结束于第 {node.timing.from + node.timing.durationInFrames - 1} 帧</small>
    </section>
    <section className="inspector-section node-motion-editor">
      <h3>图层动效</h3>
      <MotionSelect label="入场" phase="enter" value={node.motion.enter} onChange={(enter) => updateMotion({enter})} />
      <label className="field"><span>入场帧数</span><input type="number" min={1} max={Math.max(1, node.timing.durationInFrames)} value={node.motion.enterDuration} onChange={(event) => updateMotion({enterDuration: clamp(event.target.valueAsNumber || 1, 1, Math.max(1, node.timing.durationInFrames))})} /></label>
      <MotionSelect label="退场" phase="exit" value={node.motion.exit} onChange={(exit) => updateMotion({exit})} />
      <label className="field"><span>退场帧数</span><input type="number" min={1} max={Math.max(1, node.timing.durationInFrames)} value={node.motion.exitDuration} onChange={(event) => updateMotion({exitDuration: clamp(event.target.valueAsNumber || 1, 1, Math.max(1, node.timing.durationInFrames))})} /></label>
      <MotionSelect label="持续动效" phase="loop" value={node.motion.loop} onChange={(loop) => updateMotion({loop})} />
      <label className="field"><span>整体强度</span><input type="range" min={0} max={2} step={0.05} value={node.motion.intensity} onChange={(event) => updateMotion({intensity: event.target.valueAsNumber})} /><small className="field-help">{node.motion.intensity.toFixed(2)}×</small></label>
      <label className="field"><span>入场强度</span><input type="range" min={0} max={1} step={0.05} value={node.motion.mix?.enter ?? 1} onChange={(event) => updateMotion({mix: {...(node.motion.mix ?? {enter: 1, exit: 1, loop: 1}), enter: event.target.valueAsNumber}})} /><small className="field-help">{((node.motion.mix?.enter ?? 1) * 100).toFixed(0)}%</small></label>
      <label className="field"><span>退场强度</span><input type="range" min={0} max={1} step={0.05} value={node.motion.mix?.exit ?? 1} onChange={(event) => updateMotion({mix: {...(node.motion.mix ?? {enter: 1, exit: 1, loop: 1}), exit: event.target.valueAsNumber}})} /><small className="field-help">{((node.motion.mix?.exit ?? 1) * 100).toFixed(0)}%</small></label>
      <label className="field"><span>持续强度</span><input type="range" min={0} max={1} step={0.05} value={node.motion.mix?.loop ?? 1} onChange={(event) => updateMotion({mix: {...(node.motion.mix ?? {enter: 1, exit: 1, loop: 1}), loop: event.target.valueAsNumber}})} /><small className="field-help">{((node.motion.mix?.loop ?? 1) * 100).toFixed(0)}%</small></label>
    </section>
  </>;
};
