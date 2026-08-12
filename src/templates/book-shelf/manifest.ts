import {zColor} from "@remotion/zod-types";
import {z} from "zod";
import {defineTemplateManifest} from "../../../packages/template-sdk/src";

export const book_shelfSchema = z.object({
  title: z.string().max(30),
  asset1: z.string(), asset2: z.string(), asset3: z.string(), asset4: z.string(), asset5: z.string(), asset6: z.string(), asset7: z.string(), asset8: z.string(),
  columns: z.number().int().min(2).max(4),
  accentColor: zColor(),
  stylePreset: z.enum(["editorial", "minimal", "vibrant"]),
});
export type BookShelfProps = z.infer<typeof book_shelfSchema>;

export const bookShelfManifest = defineTemplateManifest<BookShelfProps>({
  id: "book-shelf", compositionId: "BookShelf", version: "1.0.0", name: "书封墙", category: "media",
  tags: ["书封", "书架", "陈列", "封面"], description: "书籍封面网格逐排滑入，定格时轻微摆动回正。", schema: book_shelfSchema,
  defaultProps: {title: "", asset1: "", asset2: "", asset3: "", asset4: "", asset5: "", asset6: "", asset7: "", asset8: "", columns: 4, accentColor: "#C9A87C", stylePreset: "editorial"},
  fields: [
    {key: "title", label: "标题", section: "content", control: "text", maxLength: 30},
    {key: "columns", label: "列数", section: "layout", control: "number", min: 2, max: 4, step: 1},
    {key: "asset1", label: "封面 1", section: "data", control: "media", accept: ["image"]},
    {key: "asset2", label: "封面 2", section: "data", control: "media", accept: ["image"]},
    {key: "asset3", label: "封面 3", section: "data", control: "media", accept: ["image"]},
    {key: "asset4", label: "封面 4", section: "data", control: "media", accept: ["image"]},
    {key: "asset5", label: "封面 5", section: "data", control: "media", accept: ["image"]},
    {key: "asset6", label: "封面 6", section: "data", control: "media", accept: ["image"]},
    {key: "asset7", label: "封面 7", section: "data", control: "media", accept: ["image"]},
    {key: "asset8", label: "封面 8", section: "data", control: "media", accept: ["image"]},
    {key: "stylePreset", label: "样式", section: "style", control: "select", options: [{label: "编辑部", value: "editorial"}, {label: "极简", value: "minimal"}, {label: "鲜明", value: "vibrant"}]},
    {key: "accentColor", label: "强调色", section: "style", control: "color"},
  ],
  durationMode: "fixed-edges", capabilities: {alpha: true, audio: false, mediaSlots: 8, minDurationFrames: 120, maxDurationFrames: 18_000, supportedAspectRatios: ["16:9", "9:16", "1:1", "custom"]},
  stylePresets: [{id: "editorial", name: "编辑部", patch: {stylePreset: "editorial"}}, {id: "minimal", name: "极简", patch: {stylePreset: "minimal", accentColor: "#FFFFFF"}}, {id: "vibrant", name: "鲜明", patch: {stylePreset: "vibrant", accentColor: "#B8FF3D"}}],
  migrations: [], preview: {accent: "#C9A87C", label: "📚 书封"},
});
