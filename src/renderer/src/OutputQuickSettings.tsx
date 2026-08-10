import {useEffect, useState} from "react";
import {
  FRAME_RATE_PRESETS,
  type FrameRate,
} from "../../../packages/project-model/src";
import {EXPORT_PRESETS, type ExportPresetId} from "../../shared/export-presets";
import {DimensionInput} from "./DimensionInput";

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
  return <div className="output-quick-settings" aria-label="快捷输出设置">
    <label className="quick-output-control quick-resolution" title="点击修改分辨率，失焦或回车生效；⇄ 切换横竖屏">
      <span className="sr-only">分辨率</span>
      <DimensionInput compact width={width} height={height} onCommit={onDimensionCommit} />
    </label>
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
