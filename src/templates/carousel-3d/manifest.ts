import {zColor} from "@remotion/zod-types";
import {z} from "zod";
import {defineTemplateManifest} from "../../../packages/template-sdk/src";

export const carousel_3dSchema = z.object({
  asset1: z.string(), asset2: z.string(), asset3: z.string(), asset4: z.string(), asset5: z.string(), asset6: z.string(), asset7: z.string(), asset8: z.string(),
  speed: z.number().min(0.5).max(2),
  radius: z.number().min(120).max(300),
  accentColor: zColor(),
  stylePreset: z.enum(["editorial", "minimal", "vibrant"]),
});
export type Carousel3dProps = z.infer<typeof carousel_3dSchema>;

export const carousel3dManifest = defineTemplateManifest<Carousel3dProps>({
  id: "carousel-3d", compositionId: "Carousel3d", version: "1.0.0", name: "3D轮播", category: "media",
  tags: ["3D", "轮播", "圆环", "画廊"], description: "多张图片排成 3D 圆环匀速自转的立体轮播。", schema: carousel_3dSchema,
  defaultProps: {asset1: "", asset2: "", asset3: "", asset4: "", asset5: "", asset6: "", asset7: "", asset8: "", speed: 1, radius: 190, accentColor: "#47A7FF", stylePreset: "editorial"},
  fields: [
    {key: "speed", label: "旋转速度", section: "layout", control: "number", min: 0.5, max: 2, step: 0.1},
    {key: "radius", label: "环绕半径", section: "layout", control: "number", min: 120, max: 300, step: 1},
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
  durationMode: "loop", capabilities: {alpha: true, audio: false, mediaSlots: 8, minDurationFrames: 120, maxDurationFrames: 18_000, supportedAspectRatios: ["16:9", "9:16", "1:1", "custom"]},
  stylePresets: [{id: "editorial", name: "编辑部", patch: {stylePreset: "editorial"}}, {id: "minimal", name: "极简", patch: {stylePreset: "minimal", accentColor: "#FFFFFF"}}, {id: "vibrant", name: "鲜明", patch: {stylePreset: "vibrant", accentColor: "#FF6B3D"}}],
  migrations: [], preview: {accent: "#47A7FF", label: "◉ 3D"},
});
