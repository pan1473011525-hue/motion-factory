import {zColor} from "@remotion/zod-types";
import {z} from "zod";
import {defineTemplateManifest} from "../../../packages/template-sdk/src";

export const split_flapSchema = z.object({
  text: z.string().trim().min(1).max(40),
  fontSize: z.number().min(24).max(200),
  cellColor: zColor(),
  inkColor: zColor(),
  accentColor: zColor(),
  stylePreset: z.enum(["editorial", "minimal", "vibrant"]),
});
export type SplitFlapProps = z.infer<typeof split_flapSchema>;

export const splitFlapManifest = defineTemplateManifest<SplitFlapProps>({
  id: "split-flap", compositionId: "SplitFlap", version: "1.0.0", name: "翻页板标题", category: "subtitle",
  tags: ["翻页板", "标题", "机场", "3D"], description: "机场翻页板式逐字翻转的标题动画。", schema: split_flapSchema,
  defaultProps: {text: "MOTIONER", fontSize: 100, cellColor: "#1B2028", inkColor: "#F4F7FB", accentColor: "#47A7FF", stylePreset: "editorial"},
  fields: [
    {key: "text", label: "标题文本", section: "content", control: "text", maxLength: 40},
    {key: "fontSize", label: "字号", section: "style", control: "number", min: 24, max: 200, step: 1, unit: "px"},
    {key: "cellColor", label: "翻牌底色", section: "style", control: "color"},
    {key: "inkColor", label: "字符颜色", section: "style", control: "color"},
    {key: "stylePreset", label: "样式", section: "style", control: "select", options: [{label: "编辑部", value: "editorial"}, {label: "极简", value: "minimal"}, {label: "鲜明", value: "vibrant"}]},
    {key: "accentColor", label: "翻页高光", section: "style", control: "color"},
  ],
  durationMode: "fixed-edges", capabilities: {alpha: true, audio: false, mediaSlots: 0, minDurationFrames: 150, maxDurationFrames: 18_000, supportedAspectRatios: ["16:9", "9:16", "1:1", "custom"]},
  stylePresets: [{id: "editorial", name: "编辑部", patch: {stylePreset: "editorial"}}, {id: "minimal", name: "极简", patch: {stylePreset: "minimal", cellColor: "#14171C", accentColor: "#FFFFFF"}}, {id: "vibrant", name: "鲜明", patch: {stylePreset: "vibrant", cellColor: "#1A1526", inkColor: "#FFFFFF", accentColor: "#B8FF3D"}}],
  migrations: [], preview: {accent: "#47A7FF", label: "翻板"},
});
