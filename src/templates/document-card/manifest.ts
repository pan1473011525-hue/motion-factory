import {zColor} from "@remotion/zod-types";
import {z} from "zod";
import {defineTemplateManifest} from "../../../packages/template-sdk/src";

export const document_cardSchema = z.object({
  title: z.string().max(30),
  year: z.string().max(12),
  asset1: z.string(), asset2: z.string(), asset3: z.string(), asset4: z.string(), asset5: z.string(), asset6: z.string(),
  accentColor: zColor(),
  stylePreset: z.enum(["editorial", "minimal", "vibrant"]),
});
export type DocumentCardProps = z.infer<typeof document_cardSchema>;

export const documentCardManifest = defineTemplateManifest<DocumentCardProps>({
  id: "document-card", compositionId: "DocumentCard", version: "1.0.0", name: "文献卡片", category: "media",
  tags: ["文献", "引用", "卡片", "档案"], description: "文献引用卡片错位堆叠、逐张浮起，带档案编号标签。", schema: document_cardSchema,
  defaultProps: {title: "参考文献", year: "2024", asset1: "", asset2: "", asset3: "", asset4: "", asset5: "", asset6: "", accentColor: "#C9A87C", stylePreset: "editorial"},
  fields: [
    {key: "title", label: "标题", section: "content", control: "text", maxLength: 30},
    {key: "year", label: "年份标签", section: "content", control: "text", maxLength: 12},
    {key: "asset1", label: "文献 1", section: "data", control: "media", accept: ["image"]},
    {key: "asset2", label: "文献 2", section: "data", control: "media", accept: ["image"]},
    {key: "asset3", label: "文献 3", section: "data", control: "media", accept: ["image"]},
    {key: "asset4", label: "文献 4", section: "data", control: "media", accept: ["image"]},
    {key: "asset5", label: "文献 5", section: "data", control: "media", accept: ["image"]},
    {key: "asset6", label: "文献 6", section: "data", control: "media", accept: ["image"]},
    {key: "stylePreset", label: "样式", section: "style", control: "select", options: [{label: "编辑部", value: "editorial"}, {label: "极简", value: "minimal"}, {label: "鲜明", value: "vibrant"}]},
    {key: "accentColor", label: "强调色", section: "style", control: "color"},
  ],
  durationMode: "fixed-edges", capabilities: {alpha: true, audio: false, mediaSlots: 6, minDurationFrames: 120, maxDurationFrames: 18_000, supportedAspectRatios: ["16:9", "9:16", "1:1", "custom"]},
  stylePresets: [{id: "editorial", name: "编辑部", patch: {stylePreset: "editorial"}}, {id: "minimal", name: "极简", patch: {stylePreset: "minimal", accentColor: "#FFFFFF"}}, {id: "vibrant", name: "鲜明", patch: {stylePreset: "vibrant", accentColor: "#B8FF3D"}}],
  migrations: [], preview: {accent: "#C9A87C", label: "📄 文献"},
});
