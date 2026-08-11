import {useEffect, useState} from "react";
import {
  FRAME_RATE_PRESETS,
  type FrameRate,
} from "../../../packages/project-model/src";
import {EXPORT_PRESETS, type ExportPresetId} from "../../shared/export-presets";
import {
  RESOLUTION_TIERS,
  getCanvasOrientation,
  getPresetDimensions,
  getResolutionTier,
  type CanvasOrientation,
  type ResolutionTier,
} from "./resolution-presets";

const frameRateKey = (fps: FrameRate): string => `${fps.numerator}/${fps.denominator}`;

const QuickDurationInput: React.FC<{
  seconds: number;
  onCommit: (seconds: number) => void;
}> = ({seconds, onCommit}) => {
  const [draft, setDraft] = useState(seconds.toFixed(3));
  useEffect(() => setDraft(seconds.toFixed(3)), [seconds]);

  const commit = (): void => {
    const value = Number(draft);
    if (Number.isFinite(value) && value > 0) onCommit(value);
    else setDraft(seconds.toFixed(3));
  };

  return <label className="quick-output-control quick-duration" title="点击修改项目时长">
    <span className="sr-only">时长（秒）</span>
    <input
      aria-label="时长（秒）"
      type="number"
      min={0.1}
      max={7200}
      step={0.1}
      value={draft}
      onChange={(event) => setDraft(event.target.value)}
      onFocus={(event) => event.currentTarget.select()}
      onBlur={commit}
      onKeyDown={(event) => {
        if (event.key === "Enter") event.currentTarget.blur();
        if (event.key === "Escape") {
          setDraft(seconds.toFixed(3));
          event.currentTarget.blur();
        }
      }}
    />
    <b>秒</b>
  </label>;
};

export const OutputQuickSettings: React.FC<{
  width: number;
  height: number;
  fps: FrameRate;
  durationSeconds: number;
  exportPresetId: ExportPresetId;
  onDimensionCommit: (width: number, height: number) => void;
  onFrameRateChange: (value: string) => void;
  onDurationChange: (seconds: number) => void;
  onExportPresetChange: (presetId: ExportPresetId) => void;
}> = ({width, height, fps, durationSeconds, exportPresetId, onDimensionCommit, onFrameRateChange, onDurationChange, onExportPresetChange}) => {
  const resolutionTier = getResolutionTier(width, height);
  const orientation = getCanvasOrientation(width, height);
  const applyPreset = (tier: ResolutionTier, nextOrientation: CanvasOrientation): void => {
    const dimensions = getPresetDimensions(tier, nextOrientation);
    onDimensionCommit(dimensions.width, dimensions.height);
  };
  return <div className="output-quick-settings" aria-label="快捷输出设置">
    <div className="quick-output-control quick-resolution" title="选择清晰度档位和横竖屏；自定义尺寸请前往导出设置">
      <label><span className="sr-only">清晰度</span><select aria-label="清晰度" value={resolutionTier ?? "custom"} onChange={(event) => {
        if (event.target.value !== "custom") applyPreset(event.target.value as ResolutionTier, orientation);
      }}><option value="custom" disabled>自定义</option>{RESOLUTION_TIERS.map((preset) => <option key={preset.id} value={preset.id}>{preset.label}</option>)}</select></label>
      <label><span className="sr-only">画面方向</span><select aria-label="画面方向" value={orientation} onChange={(event) => {
        const nextOrientation = event.target.value as CanvasOrientation;
        if (resolutionTier) applyPreset(resolutionTier, nextOrientation);
        else onDimensionCommit(nextOrientation === "portrait" ? Math.min(width, height) : Math.max(width, height), nextOrientation === "portrait" ? Math.max(width, height) : Math.min(width, height));
      }}><option value="landscape">横屏</option><option value="portrait">竖屏</option></select></label>
    </div>
    <label className="quick-output-control quick-fps" title="点击修改帧率">
      <span className="sr-only">帧率</span>
      <select aria-label="帧率" value={frameRateKey(fps)} onChange={(event) => onFrameRateChange(event.target.value)}>
        {FRAME_RATE_PRESETS.map((preset) => <option key={frameRateKey(preset.value)} value={frameRateKey(preset.value)}>{preset.label} fps</option>)}
      </select>
    </label>
    <QuickDurationInput seconds={durationSeconds} onCommit={onDurationChange} />
    <label className="quick-output-control quick-format" title="点击修改导出格式">
      <span className="sr-only">导出格式</span>
      <select aria-label="导出格式" value={exportPresetId} onChange={(event) => onExportPresetChange(event.target.value as ExportPresetId)}>
        {EXPORT_PRESETS.map((preset) => <option key={preset.id} value={preset.id}>{preset.shortLabel}</option>)}
      </select>
    </label>
  </div>;
};
