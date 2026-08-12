import {zColor} from "@remotion/zod-types";
import {z} from "zod";
import {defineTemplateManifest} from "../../../packages/template-sdk/src";

export const text_scrambleSchema = z.object({
  text: z.string().trim().min(1).max(60),
  fontSize: z.number().min(16).max(300),
  color: zColor(),
  accentColor: zColor(),
  fontFamily: z.enum(["mono", "sans"]),
  stylePreset: z.enum(["editorial", "minimal", "vibrant"]),
});
export type TextScrambleProps = z.infer<typeof text_scrambleSchema>;

export const textScrambleManifest = defineTemplateManifest<TextScrambleProps>({
  id: "text-scramble", compositionId: "TextScramble", version: "1.0.0", name: "乱码解码标题", category: "subtitle",
  tags: ["乱码", "解码", "标题", "科技"], description: "乱码随机跳字后锁定为最终文字的科技感标题。", schema: text_scrambleSchema,
  defaultProps: {text: "MOTIONER", fontSize: 96, color: "#F4F7FB", accentColor: "#47A7FF", fontFamily: "mono", stylePreset: "editorial"},
  fields: [
    {key: "text", label: "标题文本", section: "content", control: "text", maxLength: 60},
    {key: "fontSize", label: "字号", section: "style", control: "number", min: 16, max: 300, step: 1, unit: "px"},
    {key: "color", label: "文字颜色", section: "style", control: "color"},
    {key: "fontFamily", label: "字体", section: "style", control: "select", options: [{label: "等宽", value: "mono"}, {label: "无衬线", value: "sans"}]},
    {key: "stylePreset", label: "样式", section: "style", control: "select", options: [{label: "编辑部", value: "editorial"}, {label: "极简", value: "minimal"}, {label: "鲜明", value: "vibrant"}]},
    {key: "accentColor", label: "锁定辉光色", section: "style", control: "color"},
  ],
  durationMode: "fixed-edges", capabilities: {alpha: true, audio: false, mediaSlots: 0, minDurationFrames: 120, maxDurationFrames: 18_000, supportedAspectRatios: ["16:9", "9:16", "1:1", "custom"]},
  stylePresets: [{id: "editorial", name: "编辑部", patch: {stylePreset: "editorial"}}, {id: "minimal", name: "极简", patch: {stylePreset: "minimal", accentColor: "#FFFFFF"}}, {id: "vibrant", name: "鲜明", patch: {stylePreset: "vibrant", accentColor: "#B8FF3D"}}],
  migrations: [], preview: {accent: "#47A7FF", label: "乱码"},
});
