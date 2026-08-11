import {useEffect, useState} from "react";
import {DEFAULT_TEMPLATE_APPEARANCE, type TemplateAppearance} from "../../../packages/project-model/src";
import {InspectorGroup} from "./InspectorGroup";
import {CompactPropertyRow, RangeNumberControl} from "./PropertyControls";

const PRESETS = [
  {id: "black", label: "纯黑", color: "#000000"},
  {id: "graphite", label: "深灰", color: "#111418"},
  {id: "cool", label: "冷蓝黑", color: "#101A2A"},
  {id: "warm", label: "暖灰黑", color: "#261D1A"},
  {id: "neutral", label: "中性灰", color: "#2A2D32"},
  {id: "soft", label: "柔和浅色", color: "#F2F3F5"},
  {id: "white", label: "纯白", color: "#FFFFFF"},
] as const;

const isHexColor = (value: string): boolean => /^#[0-9A-F]{6}$/u.test(value);

export const TemplateAppearanceEditor: React.FC<{
  value: TemplateAppearance;
  onChange: (value: TemplateAppearance) => void;
}> = ({value, onChange}) => {
  const color = value.surfaceColor ?? "#111418";
  const [draft, setDraft] = useState(color.toUpperCase());
  const [recent, setRecent] = useState<string[]>(() => {
    try { return JSON.parse(window.localStorage.getItem("motioner.recentSurfaceColors") ?? "[]") as string[]; }
    catch { return []; }
  });
  useEffect(() => setDraft(color.toUpperCase()), [color]);

  const remember = (next: string): void => {
    const colors = [next.toUpperCase(), ...recent.filter((candidate) => candidate !== next.toUpperCase())].slice(0, 6);
    setRecent(colors);
    window.localStorage.setItem("motioner.recentSurfaceColors", JSON.stringify(colors));
  };
  const applyColor = (next: string, rememberColor = false): void => {
    const normalized = next.toUpperCase();
    setDraft(normalized);
    onChange({...value, surfaceColor: normalized, surfaceOpacity: value.surfaceOpacity === 0 ? 1 : value.surfaceOpacity, surfaceTone: "auto"});
    if (rememberColor) remember(normalized);
  };
  const commitDraft = (): void => {
    const normalized = draft.trim().toUpperCase();
    if (isHexColor(normalized)) applyColor(normalized, true);
    else setDraft(color.toUpperCase());
  };

  return <InspectorGroup title="模组外观" defaultOpen className="template-appearance-editor">
    <div className="surface-presets" role="list" aria-label="模组底色预设">
      <button type="button" className={value.surfaceColor === null ? "active" : ""} onClick={() => onChange({...DEFAULT_TEMPLATE_APPEARANCE})}><span className="surface-original" />原始</button>
      <button type="button" className={value.surfaceOpacity === 0 ? "active" : ""} onClick={() => onChange({...value, surfaceColor: value.surfaceColor ?? "#111418", surfaceOpacity: 0})}><span className="surface-transparent" />透明</button>
      {PRESETS.map((preset) => <button type="button" key={preset.id} className={value.surfaceColor === preset.color && value.surfaceOpacity > 0 ? "active" : ""} title={`${preset.label} ${preset.color}`} onClick={() => applyColor(preset.color)}><span style={{backgroundColor: preset.color}} />{preset.label}</button>)}
    </div>
    <label className="field"><span>自定义颜色</span><div className="color-control"><input type="color" value={color} onChange={(event) => applyColor(event.target.value, true)} /><input value={draft} maxLength={7} onChange={(event) => setDraft(event.target.value.toUpperCase())} onBlur={commitDraft} onKeyDown={(event) => {if (event.key === "Enter") event.currentTarget.blur(); if (event.key === "Escape") {setDraft(color.toUpperCase()); event.currentTarget.blur();}}} /></div></label>
    {recent.length > 0 && <div className="recent-surface-colors"><span>最近使用</span><div>{recent.map((recentColor) => <button type="button" key={recentColor} style={{backgroundColor: recentColor}} title={recentColor} aria-label={`使用最近颜色 ${recentColor}`} onClick={() => applyColor(recentColor)} />)}</div></div>}
    <CompactPropertyRow label="底色不透明度"><RangeNumberControl ariaLabel="底色不透明度" value={Math.round(value.surfaceOpacity * 100)} min={0} max={100} resetValue={100} onChange={(opacity) => onChange({...value, surfaceOpacity: opacity / 100})} /></CompactPropertyRow>
    <small className="field-help">仅修改动画模组内部表面；模组外围继续透明。浅色底会自动使用深色文字。</small>
  </InspectorGroup>;
};
