import {zColor} from "@remotion/zod-types";
import {z} from "zod";
import {defineTemplateManifest} from "../../../packages/template-sdk/src";

export const glow_flylineSchema = z.object({
  startX: z.number().min(0).max(100),
  startY: z.number().min(0).max(100),
  endX: z.number().min(0).max(100),
  endY: z.number().min(0).max(100),
  accentColor: zColor(),
  stylePreset: z.enum(["editorial", "minimal", "vibrant"]),
});
export type GlowFlylineProps = z.infer<typeof glow_flylineSchema>;

export const glowFlylineManifest = defineTemplateManifest<GlowFlylineProps>({
  id: "glow-flyline", compositionId: "GlowFlyline", version: "1.0.0", name: "发光飞行弧线", category: "information",
  tags: ["飞线", "连接", "弧线", "光点"], description: "一条贝塞尔弧线带着亮头从起点打到终点，目标点脉冲响应。", schema: glow_flylineSchema,
  defaultProps: {startX: 27, startY: 31, endX: 84, endY: 76, accentColor: "#47A7FF", stylePreset: "editorial"},
  fields: [
    {key: "startX", label: "起点 X", section: "layout", control: "number", min: 0, max: 100, step: 1, unit: "%"},
    {key: "startY", label: "起点 Y", section: "layout", control: "number", min: 0, max: 100, step: 1, unit: "%"},
    {key: "endX", label: "终点 X", section: "layout", control: "number", min: 0, max: 100, step: 1, unit: "%"},
    {key: "endY", label: "终点 Y", section: "layout", control: "number", min: 0, max: 100, step: 1, unit: "%"},
    {key: "stylePreset", label: "样式", section: "style", control: "select", options: [{label: "编辑部", value: "editorial"}, {label: "极简", value: "minimal"}, {label: "鲜明", value: "vibrant"}]},
    {key: "accentColor", label: "飞线颜色", section: "style", control: "color"},
  ],
  durationMode: "fixed-edges", capabilities: {alpha: true, audio: false, mediaSlots: 0, minDurationFrames: 100, maxDurationFrames: 18_000, supportedAspectRatios: ["16:9", "9:16", "1:1", "custom"]},
  stylePresets: [{id: "editorial", name: "编辑部", patch: {stylePreset: "editorial"}}, {id: "minimal", name: "极简", patch: {stylePreset: "minimal", accentColor: "#FFFFFF"}}, {id: "vibrant", name: "鲜明", patch: {stylePreset: "vibrant", accentColor: "#B8FF3D"}}],
  migrations: [], preview: {accent: "#47A7FF", label: "⌒ 飞线"},
});
