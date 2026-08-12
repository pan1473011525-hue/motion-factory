import {zColor} from "@remotion/zod-types";
import {z} from "zod";
import {defineTemplateManifest} from "../../../packages/template-sdk/src";

export const sepia_albumSchema = z.object({
  title: z.string().max(30),
  stampText: z.string().max(12),
  asset1: z.string(), asset2: z.string(), asset3: z.string(), asset4: z.string(), asset5: z.string(), asset6: z.string(),
  accentColor: zColor(),
  stylePreset: z.enum(["editorial", "minimal", "vibrant"]),
});
export type SepiaAlbumProps = z.infer<typeof sepia_albumSchema>;

export const sepiaAlbumManifest = defineTemplateManifest<SepiaAlbumProps>({
  id: "sepia-album", compositionId: "SepiaAlbum", version: "1.0.0", name: "老照片相册", category: "media",
  tags: ["老照片", "sepia", "相册", "怀旧"], description: "老照片滤镜 + 颗粒 + 印章水印 + 纸纹底的怀旧相册。", schema: sepia_albumSchema,
  defaultProps: {title: "", stampText: "归档", asset1: "", asset2: "", asset3: "", asset4: "", asset5: "", asset6: "", accentColor: "#8B6B4A", stylePreset: "editorial"},
  fields: [
    {key: "title", label: "标题", section: "content", control: "text", maxLength: 30},
    {key: "stampText", label: "印章文字", section: "content", control: "text", maxLength: 12},
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
  stylePresets: [{id: "editorial", name: "编辑部", patch: {stylePreset: "editorial"}}, {id: "minimal", name: "极简", patch: {stylePreset: "minimal", accentColor: "#FFFFFF"}}, {id: "vibrant", name: "鲜明", patch: {stylePreset: "vibrant", accentColor: "#B8FF3D"}}],
  migrations: [], preview: {accent: "#8B6B4A", label: "🖼 老照片"},
});
