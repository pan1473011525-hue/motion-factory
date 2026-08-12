import {zColor} from "@remotion/zod-types";
import {z} from "zod";
import {defineTemplateManifest} from "../../../packages/template-sdk/src";

export const card_stackSchema = z.object({
  count: z.number().int().min(4).max(12),
  accentColor: zColor(),
  stylePreset: z.enum(["editorial", "minimal", "vibrant"]),
});
export type CardStackProps = z.infer<typeof card_stackSchema>;

export const cardStackManifest = defineTemplateManifest<CardStackProps>({
  id: "card-stack", compositionId: "CardStack", version: "1.0.0", name: "卡片堆叠", category: "information",
  tags: ["卡片", "堆叠", "扇形", "3D"], description: "多张卡片弹入叠摞后呈 3D 扇形展开。", schema: card_stackSchema,
  defaultProps: {count: 8, accentColor: "#47A7FF", stylePreset: "editorial"},
  fields: [
    {key: "count", label: "卡片数", section: "layout", control: "number", min: 4, max: 12, step: 1},
    {key: "stylePreset", label: "样式", section: "style", control: "select", options: [{label: "编辑部", value: "editorial"}, {label: "极简", value: "minimal"}, {label: "鲜明", value: "vibrant"}]},
    {key: "accentColor", label: "卡片色", section: "style", control: "color"},
  ],
  durationMode: "fixed-edges", capabilities: {alpha: true, audio: false, mediaSlots: 0, minDurationFrames: 130, maxDurationFrames: 18_000, supportedAspectRatios: ["16:9", "9:16", "1:1", "custom"]},
  stylePresets: [{id: "editorial", name: "编辑部", patch: {stylePreset: "editorial"}}, {id: "minimal", name: "极简", patch: {stylePreset: "minimal", accentColor: "#FFFFFF"}}, {id: "vibrant", name: "鲜明", patch: {stylePreset: "vibrant", accentColor: "#B8FF3D"}}],
  migrations: [], preview: {accent: "#47A7FF", label: "🃏 堆叠"},
});
