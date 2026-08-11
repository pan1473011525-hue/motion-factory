import {Monitor, Smartphone} from "lucide-react";
import {useEffect, useRef, useState} from "react";
import {DimensionInput} from "./DimensionInput";
import {Select} from "./Select";
import {
  RESOLUTION_TIERS,
  getCanvasOrientation,
  getPresetDimensions,
  getResolutionTier,
  type CanvasOrientation,
  type ResolutionTier,
} from "./resolution-presets";

export const ResolutionSettings: React.FC<{
  width: number;
  height: number;
  onCommit: (width: number, height: number) => void;
}> = ({width, height, onCommit}) => {
  const tier = getResolutionTier(width, height);
  const orientation = getCanvasOrientation(width, height);
  const [customMode, setCustomMode] = useState(tier === null);
  const previousDimensions = useRef(`${width}x${height}`);

  useEffect(() => {
    const dimensions = `${width}x${height}`;
    if (dimensions !== previousDimensions.current && tier !== null) setCustomMode(false);
    previousDimensions.current = dimensions;
  }, [height, tier, width]);

  const applyPreset = (nextTier: ResolutionTier, nextOrientation: CanvasOrientation): void => {
    const dimensions = getPresetDimensions(nextTier, nextOrientation);
    setCustomMode(false);
    onCommit(dimensions.width, dimensions.height);
  };

  return <div className="resolution-settings">
    <label className="field"><span>清晰度</span><Select ariaLabel="清晰度" value={customMode ? "custom" : tier ?? "custom"} options={[{value: "custom", label: "自定义"}, ...RESOLUTION_TIERS.map((preset) => ({value: preset.id, label: preset.label}))]} onChange={(value) => {
      if (value === "custom") {
        setCustomMode(true);
        return;
      }
      applyPreset(value as ResolutionTier, orientation);
    }} /></label>
    <div className="field"><span>画面方向</span><div className="orientation-segment" role="group" aria-label="画面方向">
      <button type="button" className={orientation === "landscape" ? "active" : ""} aria-pressed={orientation === "landscape"} onClick={() => tier ? applyPreset(tier, "landscape") : onCommit(Math.max(width, height), Math.min(width, height))}><Monitor />横屏</button>
      <button type="button" className={orientation === "portrait" ? "active" : ""} aria-pressed={orientation === "portrait"} onClick={() => tier ? applyPreset(tier, "portrait") : onCommit(Math.min(width, height), Math.max(width, height))}><Smartphone />竖屏</button>
    </div></div>
    {(customMode || tier === null) && <DimensionInput width={width} height={height} onCommit={onCommit} />}
    {!customMode && tier !== null && <small className="field-help resolution-readout">{width} × {height}</small>}
  </div>;
};
