import {zColor} from "@remotion/zod-types";
import {z} from "zod";
import {defineTemplateManifest} from "../../../packages/template-sdk/src";

export const polaroid_photoSchema = z.object({
  title: z.string().max(30),
  caption: z.string().max(40),
  asset1: z.string(), asset2: z.string(), asset3: z.string(), asset4: z.string(), asset5: z.string(), asset6: z.string(),
  accentColor: zColor(),
  stylePreset: z.enum(["editorial", "minimal", "vibrant"]),
});
export type PolaroidPhotoProps = z.infer<typeof polaroid_photoSchema>;

export const polaroidPhotoManifest = defineTemplateManifest<PolaroidPhotoProps>({
  id: "polaroid-photo", compositionId: "PolaroidPhoto", version: "1.0.0", name: "动态相框", category: "media",
  tags: ["宝丽来", "相框", "堆叠", "回忆"], description: "宝丽来白边相框堆叠散开、轻微旋转定格的回忆展示。", schema: polaroid_photoSchema,
  defaultProps: {title: "", caption: "回忆时刻", asset1: "", asset2: "", asset3: "", asset4: "", asset5: "", asset6: "", accentColor: "#47A7FF", stylePreset: "editorial"},
  fields: [
    {key: "title", label: "标题", section: "content", control: "text", maxLength: 30},
    {key: "caption", label: "标签文字", section: "content", control: "text", maxLength: 40},
    {key: "asset1", label: "照片 1", section: "data", control: "media", accept: ["image"]},
    {key: "asset2", label: "照片 2", section: "data", control: "media", accept: ["image"]},
    {key: "asset3", label: "照片 3", section: "data", control: "media", accept: ["image"]},
    {key: "asset4", label: "照片 4", section: "data", control: "media", accept: ["image"]},
    {key: "asset5", label: "照片 5", section: "data", control: "media", accept: ["image"]},
    {key: "asset6", label: "照片 6", section: "data", control: "media", accept: ["image"]},
    {key: "stylePreset", label: "样式", section: "style", control: "select", options: [{label: "编辑部", value: "editorial"}, {label: "极简", value: "minimal"}, {label: "鲜明", value: "vibrant"}]},
    {key: "accentColor", label: "强调色", section: "style", control: "color"},
  ],
  durationMode: "fixed-edges", capabilities: {alpha: true, audio: false, mediaSlots: 6, minDurationFrames: 110, maxDurationFrames: 18_000, supportedAspectRatios: ["16:9", "9:16", "1:1", "custom"]},
  stylePresets: [{id: "editorial", name: "编辑部", patch: {stylePreset: "editorial"}}, {id: "minimal", name: "极简", patch: {stylePreset: "minimal", accentColor: "#FFFFFF"}}, {id: "vibrant", name: "鲜明", patch: {stylePreset: "vibrant", accentColor: "#FF6B3D"}}],
  migrations: [], preview: {accent: "#47A7FF", label: "▢ 相框"},
});
