import {zColor} from "@remotion/zod-types";
import {z} from "zod";
import {defineTemplateManifest} from "../../../packages/template-sdk/src";

export const confetti_celebrateSchema = z.object({
  title: z.string().max(40),
  value: z.number(),
  decimals: z.number().int().min(0).max(2),
  suffix: z.string().max(8),
  accentColor: zColor(),
  stylePreset: z.enum(["editorial", "minimal", "vibrant"]),
});
export type ConfettiCelebrateProps = z.infer<typeof confetti_celebrateSchema>;

export const confettiCelebrateManifest = defineTemplateManifest<ConfettiCelebrateProps>({
  id: "confetti-celebrate", compositionId: "ConfettiCelebrate", version: "1.0.0", name: "彩带庆祝", category: "data",
  tags: ["彩带", "庆祝", "KPI", "粒子"], description: "大数字落定瞬间双侧彩屑交叉喷洒的庆祝动效。", schema: confetti_celebrateSchema,
  defaultProps: {title: "CONFETTI CROSSFIRE", value: 98.5, decimals: 1, suffix: "%", accentColor: "#B45309", stylePreset: "editorial"},
  fields: [
    {key: "title", label: "标题", section: "content", control: "text", maxLength: 40},
    {key: "value", label: "数值", section: "data", control: "number", step: 0.01},
    {key: "decimals", label: "小数位", section: "data", control: "number", min: 0, max: 2, step: 1},
    {key: "suffix", label: "后缀", section: "content", control: "text", maxLength: 8},
    {key: "stylePreset", label: "样式", section: "style", control: "select", options: [{label: "编辑部", value: "editorial"}, {label: "极简", value: "minimal"}, {label: "鲜明", value: "vibrant"}]},
    {key: "accentColor", label: "彩屑强调色", section: "style", control: "color"},
  ],
  durationMode: "fixed-edges", capabilities: {alpha: true, audio: false, mediaSlots: 0, minDurationFrames: 150, maxDurationFrames: 18_000, supportedAspectRatios: ["16:9", "9:16", "1:1", "custom"]},
  stylePresets: [{id: "editorial", name: "编辑部", patch: {stylePreset: "editorial"}}, {id: "minimal", name: "极简", patch: {stylePreset: "minimal", accentColor: "#FFFFFF"}}, {id: "vibrant", name: "鲜明", patch: {stylePreset: "vibrant", accentColor: "#FF6B3D"}}],
  migrations: [], preview: {accent: "#B45309", label: "彩带"},
});
