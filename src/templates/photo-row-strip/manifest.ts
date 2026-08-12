import {zColor} from "@remotion/zod-types";
import {z} from "zod";
import {defineTemplateManifest} from "../../../packages/template-sdk/src";

export const photo_row_stripSchema = z.object({
  title: z.string().max(36),
  asset1: z.string(), asset2: z.string(), asset3: z.string(), asset4: z.string(), asset5: z.string(), asset6: z.string(), asset7: z.string(), asset8: z.string(),
  targetRowHeight: z.number().min(150).max(400),
  gap: z.number().min(0).max(40),
  radius: z.number().min(0).max(40),
  accentColor: zColor(),
  stylePreset: z.enum(["editorial", "minimal", "vibrant"]),
});
export type PhotoRowStripProps = z.infer<typeof photo_row_stripSchema>;

export const photoRowStripManifest = defineTemplateManifest<PhotoRowStripProps>({
  id: "photo-row-strip", compositionId: "PhotoRowStrip", version: "1.0.0", name: "卡片横流", category: "media",
  tags: ["横排", "卡片", "轮播", "多图"], description: "多张图片等宽横排，依次从左向右滑入。", schema: photo_row_stripSchema,
  defaultProps: {title: "", asset1: "", asset2: "", asset3: "", asset4: "", asset5: "", asset6: "", asset7: "", asset8: "", targetRowHeight: 260, gap: 12, radius: 10, accentColor: "#47A7FF", stylePreset: "editorial"},
  fields: [
    {key: "title", label: "标题", section: "content", control: "text", maxLength: 36},
    {key: "targetRowHeight", label: "行高", section: "layout", control: "number", min: 150, max: 400, step: 1, unit: "px"},
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
    {key: "stylePreset", label: "样式", section: "style", control: "select", options: [{label: "编辑部", value: "editorial"}, {label: "极简", value: "minimal"}, {label: "鲜明", value: "vibrant"}]},
    {key: "accentColor", label: "强调色", section: "style", control: "color"},
  ],
  durationMode: "fixed-edges", capabilities: {alpha: true, audio: false, mediaSlots: 8, minDurationFrames: 100, maxDurationFrames: 18_000, supportedAspectRatios: ["16:9", "9:16", "1:1", "custom"]},
  stylePresets: [{id: "editorial", name: "编辑部", patch: {stylePreset: "editorial"}}, {id: "minimal", name: "极简", patch: {stylePreset: "minimal", accentColor: "#FFFFFF"}}, {id: "vibrant", name: "鲜明", patch: {stylePreset: "vibrant", accentColor: "#FF6B3D"}}],
  migrations: [], preview: {accent: "#47A7FF", label: "▭ 横排"},
});
