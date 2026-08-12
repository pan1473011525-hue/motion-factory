import {zColor} from "@remotion/zod-types";
import {z} from "zod";
import {defineTemplateManifest} from "../../../packages/template-sdk/src";

export const gauge_readoutSchema = z.object({
  title: z.string().max(40),
  value1: z.number().min(0).max(100),
  value2: z.number().min(0).max(100),
  value3: z.number().min(0).max(100),
  suffix: z.string().max(8),
  accentColor: zColor(),
  stylePreset: z.enum(["editorial", "minimal", "vibrant"]),
});
export type GaugeReadoutProps = z.infer<typeof gauge_readoutSchema>;

export const gaugeReadoutManifest = defineTemplateManifest<GaugeReadoutProps>({
  id: "gauge-readout", compositionId: "GaugeReadout", version: "1.0.0", name: "仪表盘", category: "chart",
  tags: ["仪表", "指针", "表盘", "读数"], description: "三个 270° 表盘错峰扫针到目标值并弹出读数。", schema: gauge_readoutSchema,
  defaultProps: {title: "NEEDLE SWEEP SELF-TEST", value1: 70, value2: 44, value3: 87, suffix: "%", accentColor: "#B45309", stylePreset: "editorial"},
  fields: [
    {key: "title", label: "标题", section: "content", control: "text", maxLength: 40},
    {key: "value1", label: "表盘 1 数值", section: "data", control: "number", min: 0, max: 100, step: 1},
    {key: "value2", label: "表盘 2 数值", section: "data", control: "number", min: 0, max: 100, step: 1},
    {key: "value3", label: "表盘 3 数值", section: "data", control: "number", min: 0, max: 100, step: 1},
    {key: "suffix", label: "单位", section: "content", control: "text", maxLength: 8},
    {key: "stylePreset", label: "样式", section: "style", control: "select", options: [{label: "编辑部", value: "editorial"}, {label: "极简", value: "minimal"}, {label: "鲜明", value: "vibrant"}]},
    {key: "accentColor", label: "指针颜色", section: "style", control: "color"},
  ],
  durationMode: "fixed-edges", capabilities: {alpha: true, audio: false, mediaSlots: 0, minDurationFrames: 140, maxDurationFrames: 18_000, supportedAspectRatios: ["16:9", "9:16", "1:1", "custom"]},
  stylePresets: [{id: "editorial", name: "编辑部", patch: {stylePreset: "editorial"}}, {id: "minimal", name: "极简", patch: {stylePreset: "minimal", accentColor: "#FFFFFF"}}, {id: "vibrant", name: "鲜明", patch: {stylePreset: "vibrant", accentColor: "#B8FF3D"}}],
  migrations: [], preview: {accent: "#B45309", label: "仪表"},
});
