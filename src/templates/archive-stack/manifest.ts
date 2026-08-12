import {zColor} from "@remotion/zod-types";
import {z} from "zod";
import {defineTemplateManifest} from "../../../packages/template-sdk/src";

export const archive_stackSchema = z.object({
  title: z.string().max(30),
  asset1: z.string(), asset2: z.string(), asset3: z.string(), asset4: z.string(), asset5: z.string(), asset6: z.string(),
  accentColor: zColor(),
  stylePreset: z.enum(["editorial", "minimal", "vibrant"]),
});
export type ArchiveStackProps = z.infer<typeof archive_stackSchema>;

export const archiveStackManifest = defineTemplateManifest<ArchiveStackProps>({
  id: "archive-stack", compositionId: "ArchiveStack", version: "1.0.0", name: "档案堆叠", category: "media",
  tags: ["档案", "堆叠", "资料", "优雅"], description: "一叠档案资料从中心克制地散开成网格。", schema: archive_stackSchema,
  defaultProps: {title: "", asset1: "", asset2: "", asset3: "", asset4: "", asset5: "", asset6: "", accentColor: "#9B8AFB", stylePreset: "editorial"},
  fields: [
    {key: "title", label: "标题", section: "content", control: "text", maxLength: 30},
    {key: "asset1", label: "资料 1", section: "data", control: "media", accept: ["image"]},
    {key: "asset2", label: "资料 2", section: "data", control: "media", accept: ["image"]},
    {key: "asset3", label: "资料 3", section: "data", control: "media", accept: ["image"]},
    {key: "asset4", label: "资料 4", section: "data", control: "media", accept: ["image"]},
    {key: "asset5", label: "资料 5", section: "data", control: "media", accept: ["image"]},
    {key: "asset6", label: "资料 6", section: "data", control: "media", accept: ["image"]},
    {key: "stylePreset", label: "样式", section: "style", control: "select", options: [{label: "编辑部", value: "editorial"}, {label: "极简", value: "minimal"}, {label: "鲜明", value: "vibrant"}]},
    {key: "accentColor", label: "强调色", section: "style", control: "color"},
  ],
  durationMode: "fixed-edges", capabilities: {alpha: true, audio: false, mediaSlots: 6, minDurationFrames: 110, maxDurationFrames: 18_000, supportedAspectRatios: ["16:9", "9:16", "1:1", "custom"]},
  stylePresets: [{id: "editorial", name: "编辑部", patch: {stylePreset: "editorial"}}, {id: "minimal", name: "极简", patch: {stylePreset: "minimal", accentColor: "#FFFFFF"}}, {id: "vibrant", name: "鲜明", patch: {stylePreset: "vibrant", accentColor: "#B8FF3D"}}],
  migrations: [], preview: {accent: "#9B8AFB", label: "🗂 档案"},
});
