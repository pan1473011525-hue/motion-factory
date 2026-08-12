import {zColor} from "@remotion/zod-types";
import {z} from "zod";
import {defineTemplateManifest} from "../../../packages/template-sdk/src";

export const spotlight_photoSchema = z.object({
  title: z.string().max(30),
  asset1: z.string(), asset2: z.string(), asset3: z.string(),
  accentColor: zColor(),
  stylePreset: z.enum(["editorial", "minimal", "vibrant"]),
});
export type SpotlightPhotoProps = z.infer<typeof spotlight_photoSchema>;

export const spotlightPhotoManifest = defineTemplateManifest<SpotlightPhotoProps>({
  id: "spotlight-photo", compositionId: "SpotlightPhoto", version: "1.0.0", name: "聚光强调", category: "media",
  tags: ["聚光", "强调", "产品", "暗场"], description: "暗场聚光灯扫过逐张揭示图片，最后整体提亮定格。", schema: spotlight_photoSchema,
  defaultProps: {title: "", asset1: "", asset2: "", asset3: "", accentColor: "#F5F5F3", stylePreset: "editorial"},
  fields: [
    {key: "title", label: "标题", section: "content", control: "text", maxLength: 30},
    {key: "asset1", label: "图片 1", section: "data", control: "media", accept: ["image"]},
    {key: "asset2", label: "图片 2（可选）", section: "data", control: "media", accept: ["image"]},
    {key: "asset3", label: "图片 3（可选）", section: "data", control: "media", accept: ["image"]},
    {key: "stylePreset", label: "样式", section: "style", control: "select", options: [{label: "编辑部", value: "editorial"}, {label: "极简", value: "minimal"}, {label: "鲜明", value: "vibrant"}]},
    {key: "accentColor", label: "强调色", section: "style", control: "color"},
  ],
  durationMode: "fixed-edges", capabilities: {alpha: true, audio: false, mediaSlots: 3, minDurationFrames: 130, maxDurationFrames: 18_000, supportedAspectRatios: ["16:9", "9:16", "1:1", "custom"]},
  stylePresets: [{id: "editorial", name: "编辑部", patch: {stylePreset: "editorial"}}, {id: "minimal", name: "极简", patch: {stylePreset: "minimal", accentColor: "#FFFFFF"}}, {id: "vibrant", name: "鲜明", patch: {stylePreset: "vibrant", accentColor: "#FFD54A"}}],
  migrations: [], preview: {accent: "#F5F5F3", label: "◉ 聚光"},
});
