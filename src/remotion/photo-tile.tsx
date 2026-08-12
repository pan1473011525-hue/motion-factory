// 图片展示模板的媒体占位块：有素材渲染 MediaSlot，无素材显示带序号的美观渐变块，
// 保证模板库预览与播放时布局/动效完整可见（填图后自动替换为真实图片）。
import type {CSSProperties} from "react";
import {MediaSlot} from "./primitives";

export const PhotoTile: React.FC<{
  assetId: string;
  index: number;
  label?: string;
  accent?: string;
  style?: CSSProperties;
}> = ({assetId, index, label, style}) => {
  if (assetId) {
    return <MediaSlot assetId={assetId} radius={0} label={label ?? `图片 ${index + 1}`} />;
  }
  // 占位：按序号变化的渐变 + 居中序号
  const hue = (210 + index * 36) % 360;
  return (
    <div style={{
      width: "100%", height: "100%", boxSizing: "border-box",
      background: `linear-gradient(140deg, hsl(${hue}, 46%, 34%) 0%, hsl(${hue + 24}, 52%, 20%) 100%)`,
      border: "1px solid rgba(255,255,255,0.14)",
      display: "flex", alignItems: "center", justifyContent: "center",
      color: "rgba(255,255,255,0.92)", fontWeight: 800, letterSpacing: 1,
      ...style,
    }}>
      {label ?? `图片 ${index + 1}`}
    </div>
  );
};
