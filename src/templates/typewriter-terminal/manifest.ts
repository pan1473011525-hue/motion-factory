import {zColor} from "@remotion/zod-types";
import {z} from "zod";
import {defineTemplateManifest} from "../../../packages/template-sdk/src";

export const typewriter_terminalSchema = z.object({
  text: z.string().trim().min(1).max(120),
  fontSize: z.number().min(16).max(300),
  color: zColor(),
  accentColor: zColor(),
  stylePreset: z.enum(["editorial", "minimal", "vibrant"]),
});
export type TypewriterTerminalProps = z.infer<typeof typewriter_terminalSchema>;

export const typewriterTerminalManifest = defineTemplateManifest<TypewriterTerminalProps>({
  id: "typewriter-terminal", compositionId: "TypewriterTerminal", version: "1.0.0", name: "终端打字机", category: "subtitle",
  tags: ["打字机", "终端", "代码", "标题"], description: "终端窗口内逐字符键入并回车放大的打字机标题。", schema: typewriter_terminalSchema,
  defaultProps: {text: "npm run deploy", fontSize: 56, color: "#F4F7FB", accentColor: "#47A7FF", stylePreset: "editorial"},
  fields: [
    {key: "text", label: "命令文本", section: "content", control: "text", maxLength: 120},
    {key: "fontSize", label: "字号", section: "style", control: "number", min: 16, max: 300, step: 1, unit: "px"},
    {key: "color", label: "文字颜色", section: "style", control: "color"},
    {key: "stylePreset", label: "样式", section: "style", control: "select", options: [{label: "编辑部", value: "editorial"}, {label: "极简", value: "minimal"}, {label: "鲜明", value: "vibrant"}]},
    {key: "accentColor", label: "强调色", section: "style", control: "color"},
  ],
  durationMode: "fixed-edges", capabilities: {alpha: true, audio: false, mediaSlots: 0, minDurationFrames: 90, maxDurationFrames: 18_000, supportedAspectRatios: ["16:9", "9:16", "1:1", "custom"]},
  stylePresets: [{id: "editorial", name: "编辑部", patch: {stylePreset: "editorial"}}, {id: "minimal", name: "极简", patch: {stylePreset: "minimal", accentColor: "#FFFFFF"}}, {id: "vibrant", name: "鲜明", patch: {stylePreset: "vibrant", accentColor: "#B8FF3D"}}],
  migrations: [], preview: {accent: "#47A7FF", label: "终端打字"},
});
