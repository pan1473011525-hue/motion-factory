import {useEffect, useState} from "react";

const evenDimension = (value: number, minimum: number): number =>
  Math.min(8_192, Math.max(minimum, Math.round((Number.isFinite(value) ? value : minimum) / 2) * 2));

/**
 * 分辨率输入:宽度 × 高度 + 切换横竖屏(对调)。
 * 输入为本地草稿,blur / Enter 时才提交应用(不会每输入一位数就触发一次画布变化)。
 * 切换横竖屏按钮立即对调宽高。
 */
export const DimensionInput: React.FC<{
  width: number;
  height: number;
  onCommit: (width: number, height: number) => void;
  compact?: boolean;
}> = ({width, height, onCommit, compact = false}) => {
  const [draftWidth, setDraftWidth] = useState(String(width));
  const [draftHeight, setDraftHeight] = useState(String(height));
  useEffect(() => {
    setDraftWidth(String(width));
    setDraftHeight(String(height));
  }, [width, height]);

  const commit = (): void => {
    const nextWidth = evenDimension(Number(draftWidth), 320);
    const nextHeight = evenDimension(Number(draftHeight), 240);
    setDraftWidth(String(nextWidth));
    setDraftHeight(String(nextHeight));
    if (nextWidth !== width || nextHeight !== height) {
      onCommit(nextWidth, nextHeight);
    }
  };

  const reset = (): void => {
    setDraftWidth(String(width));
    setDraftHeight(String(height));
  };

  const widthField = (
    <input
      aria-label="宽度（像素）"
      type="number"
      min={320}
      max={8192}
      step={2}
      value={draftWidth}
      onChange={(event) => setDraftWidth(event.target.value)}
      onFocus={(event) => event.currentTarget.select()}
      onBlur={commit}
      onKeyDown={(event) => {
        if (event.key === "Enter") event.currentTarget.blur();
        if (event.key === "Escape") {
          reset();
          event.currentTarget.blur();
        }
      }}
    />
  );

  const heightField = (
    <input
      aria-label="高度（像素）"
      type="number"
      min={240}
      max={8192}
      step={2}
      value={draftHeight}
      onChange={(event) => setDraftHeight(event.target.value)}
      onFocus={(event) => event.currentTarget.select()}
      onBlur={commit}
      onKeyDown={(event) => {
        if (event.key === "Enter") event.currentTarget.blur();
        if (event.key === "Escape") {
          reset();
          event.currentTarget.blur();
        }
      }}
    />
  );

  return compact
    ? <div className="dimension-input dimension-input-compact">
      {widthField}<span className="dimension-sep">×</span>{heightField}
      <button type="button" className="dimension-swap" title="切换横竖屏（对调宽高）" aria-label="切换横竖屏" onClick={() => onCommit(height, width)}>⇄</button>
    </div>
    : <div className="dimension-input">
      <label className="field field-grow"><span>宽度</span>{widthField}</label>
      <span className="dimension-sep" aria-hidden="true">×</span>
      <label className="field field-grow"><span>高度</span>{heightField}</label>
      <button type="button" className="dimension-swap" title="切换横竖屏（对调宽高）" aria-label="切换横竖屏" onClick={() => onCommit(height, width)}>⇄</button>
    </div>;
};
