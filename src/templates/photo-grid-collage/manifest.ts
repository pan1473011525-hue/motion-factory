import {zColor} from "@remotion/zod-types";
import {z} from "zod";
import {defineTemplateManifest} from "../../../packages/template-sdk/src";

export const photo_grid_collageSchema = z.object({
  title: z.string().max(36),
  asset1: z.string(), asset2: z.string(), asset3: z.string(), asset4: z.string(), asset5: z.string(), asset6: z.string(), asset7: z.string(), asset8: z.string(), asset9: z.string(),
  columns: z.number().int().min(2).max(4),
  gap: z.number().min(0).max(40),
  radius: z.number().min(0).max(40),
  accentColor: zColor(),
  stylePreset: z.enum(["editorial", "minimal", "vibrant"]),
});
export type PhotoGridCollageProps = z.infer<typeof photo_grid_collageSchema>;

export const photoGridCollageManifest = defineTemplateManifest<PhotoGridCollageProps>({
  id: "photo-grid-collage", compositionId: "PhotoGridCollage", version: "1.0.0", name: "九宫格拼贴", category: "media",
  tags: ["九宫格", "拼贴", "多图", "小红书"], description: "多张图片按网格排列、逐张错峰弹入的灵动拼贴。", schema: photo_grid_collageSchema,
  defaultProps: {title: "九宫格拼贴", asset1: "", asset2: "", asset3: "", asset4: "", asset5: "", asset6: "", asset7: "", asset8: "", asset9: "", columns: 3, gap: 10, radius: 8, accentColor: "#47A7FF", stylePreset: "editorial"},
  fields: [
    {key: "title", label: "标题", section: "content", control: "text", maxLength: 36},
    {key: "columns", label: "列数", section: "layout", control: "number", min: 2, max: 4, step: 1},
    {key: "gap", label: "间距", section: "layout", control: "number", min: 0, max: 40, step: 1, unit: "px"},
    {key: "radius", label: "圆角", section: "style", control: "number", min: 0, max: 40, step: 1, unit: "px"},
    {key: "asset1", label: "图片 1", section: "data", control: "media", accept: ["image"]},
    {key: "asset2", label: "图片 2", section: "data", control: "media", accept: ["image"]},
    {key: "asset3", label: "图片 3", section: "data", control: "media", accept: ["image"]},
    {key: "asset4", label: "图片 4", section: "data", control: "media", accept: ["image"]},
    {key: "asset5", label: "图片 5", section: "data", control: "media", accept: ["image"]},
    {key: "asset6", label: "图片 6", section: "data", control: "media", accept: ["image"]},
    {key: "asset7", label: "图片 7", section: "data", control: "media", accept: ["image"]},
    {key: "asset8", label: "图片 8", section: "data", control: "media", accept: ["image"]},
    {key: "asset9", label: "图片 9", section: "data", control: "media", accept: ["image"]},
    {key: "stylePreset", label: "样式", section: "style", control: "select", options: [{label: "编辑部", value: "editorial"}, {label: "极简", value: "minimal"}, {label: "鲜明", value: "vibrant"}]},
    {key: "accentColor", label: "强调色", section: "style", control: "color"},
  ],
  durationMode: "fixed-edges", capabilities: {alpha: true, audio: false, mediaSlots: 9, minDurationFrames: 120, maxDurationFrames: 18_000, supportedAspectRatios: ["16:9", "9:16", "1:1", "custom"]},
  stylePresets: [{id: "editorial", name: "编辑部", patch: {stylePreset: "editorial"}}, {id: "minimal", name: "极简", patch: {stylePreset: "minimal", accentColor: "#FFFFFF"}}, {id: "vibrant", name: "鲜明", patch: {stylePreset: "vibrant", accentColor: "#FF6B3D"}}],
  migrations: [], preview: {accent: "#47A7FF", label: "▦ 拼贴"},
});
