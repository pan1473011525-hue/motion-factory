import {useEffect, useState} from "react";
import {
  FRAME_RATE_PRESETS,
  type FrameRate,
} from "../../../packages/project-model/src";
import {EXPORT_PRESETS, type ExportPresetId} from "../../shared/export-presets";
import {Select} from "./Select";
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

  return <label className="quick-output-control quick-duration" data-tooltip="修改项目时长（秒）">
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
    <div className="quick-output-control quick-tier" data-tooltip="选择清晰度档位；自定义尺寸请前往导出设置">
      <Select ariaLabel="清晰度" className="quick-select quick-tier-select" value={resolutionTier ?? "custom"} options={[{value: "custom", label: "自定义", disabled: true}, ...RESOLUTION_TIERS.map((preset) => ({value: preset.id, label: preset.label}))]} onChange={(value) => {
        if (value !== "custom") applyPreset(value as ResolutionTier, orientation);
      }} />
    </div>
    <div className="quick-output-control quick-orientation" data-tooltip="选择横屏或竖屏">
      <Select ariaLabel="画面方向" className="quick-select quick-orientation-select" value={orientation} options={[{value: "landscape", label: "横屏"}, {value: "portrait", label: "竖屏"}]} onChange={(value) => {
        const nextOrientation = value as CanvasOrientation;
        if (resolutionTier) applyPreset(resolutionTier, nextOrientation);
        else onDimensionCommit(nextOrientation === "portrait" ? Math.min(width, height) : Math.max(width, height), nextOrientation === "portrait" ? Math.max(width, height) : Math.min(width, height));
      }} />
    </div>
    <div className="quick-output-control quick-fps" data-tooltip="修改帧率"><Select ariaLabel="帧率" className="quick-select" value={frameRateKey(fps)} options={FRAME_RATE_PRESETS.map((preset) => ({value: frameRateKey(preset.value), label: `${preset.label} fps`}))} onChange={onFrameRateChange} /></div>
    <QuickDurationInput seconds={durationSeconds} onCommit={onDurationChange} />
    <div className="quick-output-control quick-format" data-tooltip="修改导出格式"><Select ariaLabel="导出格式" className="quick-select" value={exportPresetId} options={EXPORT_PRESETS.map((preset) => ({value: preset.id, label: preset.shortLabel}))} onChange={(value) => onExportPresetChange(value as ExportPresetId)} /></div>
  </div>;
};
