import {zColor} from "@remotion/zod-types";
import {z} from "zod";
import {defineTemplateManifest} from "../../../packages/template-sdk/src";

export const typewriter_retypeSchema = z.object({
  text1: z.string().trim().min(1).max(60),
  text2: z.string().trim().min(1).max(60),
  keepLength: z.number().int().min(0).max(30),
  fontSize: z.number().min(16).max(300),
  color: zColor(),
  accentColor: zColor(),
  stylePreset: z.enum(["editorial", "minimal", "vibrant"]),
});
export type TypewriterRetypeProps = z.infer<typeof typewriter_retypeSchema>;

export const typewriterRetypeManifest = defineTemplateManifest<TypewriterRetypeProps>({
  id: "typewriter-retype", compositionId: "TypewriterRetype", version: "1.0.0", name: "打字机纠错", category: "subtitle",
  tags: ["打字机", "纠错", "字幕"], description: "逐字键入、删错重打的纠错打字机字幕。", schema: typewriter_retypeSchema,
  defaultProps: {text1: "just a dashboard", text2: "your command center", keepLength: 5, fontSize: 72, color: "#F4F7FB", accentColor: "#47A7FF", stylePreset: "editorial"},
  fields: [
    {key: "text1", label: "先打的文本", section: "content", control: "text", maxLength: 60},
    {key: "text2", label: "重打的正确文本", section: "content", control: "text", maxLength: 60},
    {key: "keepLength", label: "保留前缀字数", section: "content", control: "number", min: 0, max: 30, step: 1},
    {key: "fontSize", label: "字号", section: "style", control: "number", min: 16, max: 300, step: 1, unit: "px"},
    {key: "color", label: "文字颜色", section: "style", control: "color"},
    {key: "stylePreset", label: "样式", section: "style", control: "select", options: [{label: "编辑部", value: "editorial"}, {label: "极简", value: "minimal"}, {label: "鲜明", value: "vibrant"}]},
    {key: "accentColor", label: "强调色", section: "style", control: "color"},
  ],
  durationMode: "fixed-edges", capabilities: {alpha: true, audio: false, mediaSlots: 0, minDurationFrames: 180, maxDurationFrames: 18_000, supportedAspectRatios: ["16:9", "9:16", "1:1", "custom"]},
  stylePresets: [{id: "editorial", name: "编辑部", patch: {stylePreset: "editorial"}}, {id: "minimal", name: "极简", patch: {stylePreset: "minimal", accentColor: "#FFFFFF"}}, {id: "vibrant", name: "鲜明", patch: {stylePreset: "vibrant", accentColor: "#B8FF3D"}}],
  migrations: [], preview: {accent: "#47A7FF", label: "纠错打字"},
});
