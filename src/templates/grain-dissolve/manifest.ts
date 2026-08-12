import {zColor} from "@remotion/zod-types";
import {z} from "zod";
import {defineTemplateManifest} from "../../../packages/template-sdk/src";

export const grain_dissolveSchema = z.object({
  text: z.string().max(40),
  finalText: z.string().max(20),
  fontSize: z.number().min(20).max(100),
  accentColor: zColor(),
  stylePreset: z.enum(["editorial", "minimal", "vibrant"]),
});
export type GrainDissolveProps = z.infer<typeof grain_dissolveSchema>;

export const grainDissolveManifest = defineTemplateManifest<GrainDissolveProps>({
  id: "grain-dissolve", compositionId: "GrainDissolve", version: "1.0.0", name: "颗粒溶解", category: "transition",
  tags: ["颗粒", "砂化", "溶解", "退场"], description: "文字爆裂成沸腾颗粒后凝聚为发光短字标的退场动效。", schema: grain_dissolveSchema,
  defaultProps: {text: "{ MOTIONER. Now Live }", finalText: "MOTIONER", fontSize: 44, accentColor: "#FFFFFF", stylePreset: "editorial"},
  fields: [
    {key: "text", label: "原始文字", section: "content", control: "text", maxLength: 40},
    {key: "finalText", label: "凝聚字标", section: "content", control: "text", maxLength: 20},
    {key: "fontSize", label: "字号", section: "style", control: "number", min: 20, max: 100, step: 1, unit: "px"},
    {key: "stylePreset", label: "样式", section: "style", control: "select", options: [{label: "编辑部", value: "editorial"}, {label: "极简", value: "minimal"}, {label: "鲜明", value: "vibrant"}]},
    {key: "accentColor", label: "辉光颜色", section: "style", control: "color"},
  ],
  durationMode: "fixed-edges", capabilities: {alpha: true, audio: false, mediaSlots: 0, minDurationFrames: 90, maxDurationFrames: 18_000, supportedAspectRatios: ["16:9", "9:16", "1:1", "custom"]},
  stylePresets: [{id: "editorial", name: "编辑部", patch: {stylePreset: "editorial"}}, {id: "minimal", name: "极简", patch: {stylePreset: "minimal", accentColor: "#FFFFFF"}}, {id: "vibrant", name: "鲜明", patch: {stylePreset: "vibrant", accentColor: "#B8FF3D"}}],
  migrations: [], preview: {accent: "#FFFFFF", label: "砂化"},
});
