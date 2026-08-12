import {z} from "zod";
import {defineTemplateManifest} from "../../../packages/template-sdk/src";

export const transition_gradient_linearSchema = z.object({
  angle: z.number().min(0).max(360),
  edgeSoftness: z.number().min(0).max(100),
  stylePreset: z.enum(["editorial", "minimal", "vibrant"]),
});
export type TransitionGradientLinearProps = z.infer<typeof transition_gradient_linearSchema>;

export const transitionGradientLinearManifest = defineTemplateManifest<TransitionGradientLinearProps>({
  id: "transition-gradient-linear", compositionId: "TransitionGradientLinear", version: "1.0.0", name: "线性渐变遮罩", category: "transition",
  tags: ["转场", "渐变", "溶解", "遮罩"], description: "线性渐变溶解黑白转场遮罩，可调扫动角度。", schema: transition_gradient_linearSchema,
  defaultProps: {angle: 45, edgeSoftness: 8, stylePreset: "editorial"},
  fields: [
    {key: "angle", label: "扫动角度", section: "layout", control: "number", min: 0, max: 360, step: 1, unit: "°"},
    {key: "edgeSoftness", label: "边缘柔化", section: "style", control: "number", min: 0, max: 100, step: 1, unit: "%"},
    {key: "stylePreset", label: "样式", section: "style", control: "select", options: [{label: "编辑部", value: "editorial"}, {label: "极简", value: "minimal"}, {label: "鲜明", value: "vibrant"}]},
  ],
  durationMode: "fixed-edges", capabilities: {alpha: true, audio: false, mediaSlots: 0, minDurationFrames: 75, maxDurationFrames: 18_000, supportedAspectRatios: ["16:9", "9:16", "1:1", "custom"]},
  stylePresets: [{id: "editorial", name: "编辑部", patch: {stylePreset: "editorial"}}, {id: "minimal", name: "极简", patch: {stylePreset: "minimal"}}, {id: "vibrant", name: "鲜明", patch: {stylePreset: "vibrant"}}],
  migrations: [], preview: {accent: "#FFFFFF", label: "线性"},
});
