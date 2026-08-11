import {useEffect, useState} from "react";
import {Link, Link2Off, RotateCcw} from "lucide-react";

const clamp = (value: number, min: number, max: number): number => Math.min(max, Math.max(min, value));

const DraftNumber: React.FC<{
  ariaLabel: string;
  value: number;
  min: number;
  max: number;
  step: number;
  onCommit: (value: number) => void;
}> = ({ariaLabel, value, min, max, step, onCommit}) => {
  const [draft, setDraft] = useState(String(value));
  useEffect(() => setDraft(String(value)), [value]);
  const commit = (): void => {
    const parsed = Number(draft);
    if (Number.isFinite(parsed)) onCommit(clamp(parsed, min, max));
    else setDraft(String(value));
  };
  return <input aria-label={ariaLabel} type="number" min={min} max={max} step={step} value={draft} onFocus={(event) => event.currentTarget.select()} onChange={(event) => setDraft(event.target.value)} onBlur={commit} onKeyDown={(event) => {
    if (event.key === "Enter") event.currentTarget.blur();
    if (event.key === "Escape") {setDraft(String(value)); event.currentTarget.blur();}
  }} />;
};

export const RangeNumberControl: React.FC<{
  ariaLabel: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  onChange: (value: number) => void;
  resetValue?: number;
  showSlider?: boolean;
  sliderMin?: number;
  sliderMax?: number;
}> = ({ariaLabel, value, min, max, step = 1, onChange, resetValue, showSlider = true, sliderMin = min, sliderMax = max}) => (
  <div className={`range-number-control ${showSlider ? "" : "without-slider"}`.trim()}>
    {showSlider && <input aria-label={`${ariaLabel}滑块`} type="range" min={sliderMin} max={sliderMax} step={step} value={clamp(value, sliderMin, sliderMax)} onChange={(event) => onChange(event.target.valueAsNumber)} onDoubleClick={() => resetValue !== undefined && onChange(resetValue)} data-tooltip={resetValue === undefined ? undefined : `双击重置${ariaLabel}`} />}
    <div className="compact-number-box"><DraftNumber ariaLabel={ariaLabel} value={value} min={min} max={max} step={step} onCommit={onChange} /></div>
    {resetValue !== undefined && <button type="button" className="compact-reset" disabled={value === resetValue} onClick={() => onChange(resetValue)} title={`重置${ariaLabel}`} aria-label={`重置${ariaLabel}`}><RotateCcw /></button>}
  </div>
);

export const CompactPropertyRow: React.FC<{
  label: string;
  children: React.ReactNode;
  help?: string;
}> = ({label, children, help}) => <div className="compact-property-row"><span className="compact-property-label">{label}</span><div className="compact-property-control">{children}</div>{help && <small className="field-help">{help}</small>}</div>;

export const CompactPairControl: React.FC<{
  label: string;
  firstLabel: string;
  secondLabel: string;
  firstValue: number;
  secondValue: number;
  min: number;
  max: number;
  step?: number;
  onFirstChange: (value: number) => void;
  onSecondChange: (value: number) => void;
  linked?: boolean;
  onLinkedChange?: (linked: boolean) => void;
}> = ({label, firstLabel, secondLabel, firstValue, secondValue, min, max, step = 1, onFirstChange, onSecondChange, linked, onLinkedChange}) => (
  <div className="compact-pair-row">
    <span className="compact-property-label">{label}</span>
    <label><b>{firstLabel}</b><div className="compact-number-box"><DraftNumber ariaLabel={`${label} ${firstLabel}`} value={firstValue} min={min} max={max} step={step} onCommit={onFirstChange} /></div></label>
    {onLinkedChange ? <button type="button" className={`compact-link ${linked ? "active" : ""}`} onClick={() => onLinkedChange(!linked)} title={linked ? "取消宽高联动" : "联动宽高"} aria-label={linked ? "取消宽高联动" : "联动宽高"}>{linked ? <Link /> : <Link2Off />}</button> : <span className="compact-link-placeholder" aria-hidden="true" />}
    <label><b>{secondLabel}</b><div className="compact-number-box"><DraftNumber ariaLabel={`${label} ${secondLabel}`} value={secondValue} min={min} max={max} step={step} onCommit={onSecondChange} /></div></label>
  </div>
);
