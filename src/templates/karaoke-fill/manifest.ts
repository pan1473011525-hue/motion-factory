import {zColor} from "@remotion/zod-types";
import {z} from "zod";
import {defineTemplateManifest} from "../../../packages/template-sdk/src";

export const karaoke_fillSchema = z.object({
  line1: z.string().trim().min(1).max(60),
  line2: z.string().trim().min(1).max(60),
  fontSize: z.number().min(30).max(200),
  color: zColor(),
  mutedColor: zColor(),
  accentColor: zColor(),
  stylePreset: z.enum(["editorial", "minimal", "vibrant"]),
});
export type KaraokeFillProps = z.infer<typeof karaoke_fillSchema>;

export const karaokeFillManifest = defineTemplateManifest<KaraokeFillProps>({
  id: "karaoke-fill", compositionId: "KaraokeFill", version: "1.0.0", name: "卡拉OK逐词", category: "subtitle",
  tags: ["卡拉OK", "歌词", "逐词", "高亮"], description: "两行文字逐词从左到右点亮并带读指下划线的歌词高亮。", schema: karaoke_fillSchema,
  defaultProps: {line1: "SHIP FASTER", line2: "BREAK NOTHING", fontSize: 100, color: "#F7F9FB", mutedColor: "rgba(247,249,251,0.35)", accentColor: "#47A7FF", stylePreset: "editorial"},
  fields: [
    {key: "line1", label: "第一行", section: "content", control: "text", maxLength: 60},
    {key: "line2", label: "第二行", section: "content", control: "text", maxLength: 60},
    {key: "fontSize", label: "字号", section: "style", control: "number", min: 30, max: 200, step: 1, unit: "px"},
    {key: "color", label: "点亮颜色", section: "style", control: "color"},
    {key: "mutedColor", label: "未读颜色", section: "style", control: "color"},
    {key: "stylePreset", label: "样式", section: "style", control: "select", options: [{label: "编辑部", value: "editorial"}, {label: "极简", value: "minimal"}, {label: "鲜明", value: "vibrant"}]},
    {key: "accentColor", label: "读指下划线", section: "style", control: "color"},
  ],
  durationMode: "fixed-edges", capabilities: {alpha: true, audio: false, mediaSlots: 0, minDurationFrames: 150, maxDurationFrames: 18_000, supportedAspectRatios: ["16:9", "9:16", "1:1", "custom"]},
  stylePresets: [{id: "editorial", name: "编辑部", patch: {stylePreset: "editorial"}}, {id: "minimal", name: "极简", patch: {stylePreset: "minimal", accentColor: "#FFFFFF"}}, {id: "vibrant", name: "鲜明", patch: {stylePreset: "vibrant", accentColor: "#B8FF3D"}}],
  migrations: [], preview: {accent: "#47A7FF", label: "♪ 歌词"},
});
