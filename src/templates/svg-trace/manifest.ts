import {zColor} from "@remotion/zod-types";
import {z} from "zod";
import {defineTemplateManifest} from "../../../packages/template-sdk/src";

export const svg_traceSchema = z.object({
  title: z.string().max(40),
  subtitle: z.string().max(60),
  fontSize: z.number().min(16).max(80),
  accentColor: zColor(),
  stylePreset: z.enum(["editorial", "minimal", "vibrant"]),
});
export type SvgTraceProps = z.infer<typeof svg_traceSchema>;

export const svgTraceManifest = defineTemplateManifest<SvgTraceProps>({
  id: "svg-trace", compositionId: "SvgTrace", version: "1.0.0", name: "SVG描边绘制", category: "information",
  tags: ["描边", "SVG", "生长", "卡片"], description: "卡片轮廓描边生长一圈后内容淡入，标题下划线再短版生长。", schema: svg_traceSchema,
  defaultProps: {title: "DRAW SVG TRACE", subtitle: "描边生长的卡片标题", fontSize: 34, accentColor: "#F7F9FB", stylePreset: "editorial"},
  fields: [
    {key: "title", label: "标题", section: "content", control: "text", maxLength: 40},
    {key: "subtitle", label: "副标题", section: "content", control: "text", maxLength: 60},
    {key: "fontSize", label: "标题字号", section: "style", control: "number", min: 16, max: 80, step: 1, unit: "px"},
    {key: "stylePreset", label: "样式", section: "style", control: "select", options: [{label: "编辑部", value: "editorial"}, {label: "极简", value: "minimal"}, {label: "鲜明", value: "vibrant"}]},
    {key: "accentColor", label: "描边颜色", section: "style", control: "color"},
  ],
  durationMode: "fixed-edges", capabilities: {alpha: true, audio: false, mediaSlots: 0, minDurationFrames: 140, maxDurationFrames: 18_000, supportedAspectRatios: ["16:9", "9:16", "1:1", "custom"]},
  stylePresets: [{id: "editorial", name: "编辑部", patch: {stylePreset: "editorial"}}, {id: "minimal", name: "极简", patch: {stylePreset: "minimal", accentColor: "#FFFFFF"}}, {id: "vibrant", name: "鲜明", patch: {stylePreset: "vibrant", accentColor: "#B8FF3D"}}],
  migrations: [], preview: {accent: "#F7F9FB", label: "▢ 描边"},
});
