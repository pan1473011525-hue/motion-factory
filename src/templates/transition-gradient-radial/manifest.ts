import {z} from "zod";
import {defineTemplateManifest} from "../../../packages/template-sdk/src";

export const transition_gradient_radialSchema = z.object({
  edgeSoftness: z.number().min(0).max(100),
  stylePreset: z.enum(["editorial", "minimal", "vibrant"]),
});
export type TransitionGradientRadialProps = z.infer<typeof transition_gradient_radialSchema>;

export const transitionGradientRadialManifest = defineTemplateManifest<TransitionGradientRadialProps>({
  id: "transition-gradient-radial", compositionId: "TransitionGradientRadial", version: "1.0.0", name: "径向渐变遮罩", category: "transition",
  tags: ["转场", "渐变", "径向", "遮罩"], description: "径向渐变溶解黑白转场遮罩，软边圆扩散。", schema: transition_gradient_radialSchema,
  defaultProps: {edgeSoftness: 8, stylePreset: "editorial"},
  fields: [
    {key: "edgeSoftness", label: "边缘柔化", section: "style", control: "number", min: 0, max: 100, step: 1, unit: "%"},
    {key: "stylePreset", label: "样式", section: "style", control: "select", options: [{label: "编辑部", value: "editorial"}, {label: "极简", value: "minimal"}, {label: "鲜明", value: "vibrant"}]},
  ],
  durationMode: "fixed-edges", capabilities: {alpha: true, audio: false, mediaSlots: 0, minDurationFrames: 75, maxDurationFrames: 18_000, supportedAspectRatios: ["16:9", "9:16", "1:1", "custom"]},
  stylePresets: [{id: "editorial", name: "编辑部", patch: {stylePreset: "editorial"}}, {id: "minimal", name: "极简", patch: {stylePreset: "minimal"}}, {id: "vibrant", name: "鲜明", patch: {stylePreset: "vibrant"}}],
  migrations: [], preview: {accent: "#FFFFFF", label: "径向"},
});
