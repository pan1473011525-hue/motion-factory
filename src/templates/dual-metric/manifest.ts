import {zColor} from "@remotion/zod-types";
import {z} from "zod";
import {defineTemplateManifest} from "../../../packages/template-sdk/src";

export const dualMetricSchema = z.object({
  title: z.string().min(1).max(36), labelA: z.string().max(18), valueA: z.number().finite(),
  labelB: z.string().max(18), valueB: z.number().finite(), unit: z.string().max(8),
  source: z.string().max(56), accentColor: zColor(), stylePreset: z.enum(["editorial", "minimal", "vibrant"]),
});
export type DualMetricProps = z.infer<typeof dualMetricSchema>;

export const dualMetricManifest = defineTemplateManifest<DualMetricProps>({
  id: "dual-metric", compositionId: "DualMetric", version: "1.0.0", name: "双指标对比", category: "data",
  tags: ["对比", "双指标", "差值"], description: "并列比较两个关键指标，并自动突出差值。", schema: dualMetricSchema,
  defaultProps: {title: "季度营收对比", labelA: "今年", valueA: 86.4, labelB: "去年", valueB: 64.2, unit: "亿元", source: "年度财报", accentColor: "#47A7FF", stylePreset: "editorial"},
  fields: [
    {key: "title", label: "标题", section: "content", control: "text", maxLength: 36},
    {key: "labelA", label: "指标 A", section: "data", control: "text", maxLength: 18},
    {key: "valueA", label: "数值 A", section: "data", control: "number", step: 0.1},
    {key: "labelB", label: "指标 B", section: "data", control: "text", maxLength: 18},
    {key: "valueB", label: "数值 B", section: "data", control: "number", step: 0.1},
    {key: "unit", label: "单位", section: "data", control: "text", maxLength: 8},
    {key: "source", label: "来源", section: "source", control: "text", maxLength: 56},
    {key: "stylePreset", label: "样式预设", section: "style", control: "select", options: [{label: "新闻数据", value: "editorial"}, {label: "极简白线", value: "minimal"}, {label: "高对比", value: "vibrant"}]},
    {key: "accentColor", label: "强调色", section: "style", control: "color"},
  ],
  durationMode: "fixed-edges", capabilities: {alpha: true, audio: false, mediaSlots: 0, minDurationFrames: 90, maxDurationFrames: 18_000, supportedAspectRatios: ["16:9", "9:16", "1:1", "custom"]},
  stylePresets: [{id: "editorial", name: "新闻数据", patch: {stylePreset: "editorial", accentColor: "#47A7FF"}}, {id: "minimal", name: "极简白线", patch: {stylePreset: "minimal", accentColor: "#FFFFFF"}}, {id: "vibrant", name: "高对比", patch: {stylePreset: "vibrant", accentColor: "#C7FF4A"}}], migrations: [], preview: {accent: "#47A7FF", label: "86.4 / 64.2"},
});
