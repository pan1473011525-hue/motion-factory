import {z} from "zod";
import {defineTemplateManifest} from "../../../packages/template-sdk/src";

export const transition_inkSchema = z.object({
  seed: z.number().int().min(0).max(9999),
  edgeSoftness: z.number().min(0).max(100),
  stylePreset: z.enum(["editorial", "minimal", "vibrant"]),
});
export type TransitionInkProps = z.infer<typeof transition_inkSchema>;

export const transitionInkManifest = defineTemplateManifest<TransitionInkProps>({
  id: "transition-ink", compositionId: "TransitionInk", version: "1.0.0", name: "墨水洇染遮罩", category: "transition",
  tags: ["转场", "墨水", "洇染", "遮罩"], description: "墨水洇染扩散的黑白转场遮罩，边缘带自然晕染。", schema: transition_inkSchema,
  defaultProps: {seed: 7, edgeSoftness: 8, stylePreset: "editorial"},
  fields: [
    {key: "seed", label: "纹理种子", section: "layout", control: "number", min: 0, max: 9999, step: 1},
    {key: "edgeSoftness", label: "边缘柔化", section: "style", control: "number", min: 0, max: 100, step: 1, unit: "%"},
    {key: "stylePreset", label: "样式", section: "style", control: "select", options: [{label: "编辑部", value: "editorial"}, {label: "极简", value: "minimal"}, {label: "鲜明", value: "vibrant"}]},
  ],
  durationMode: "fixed-edges", capabilities: {alpha: true, audio: false, mediaSlots: 0, minDurationFrames: 75, maxDurationFrames: 18_000, supportedAspectRatios: ["16:9", "9:16", "1:1", "custom"]},
  stylePresets: [{id: "editorial", name: "编辑部", patch: {stylePreset: "editorial"}}, {id: "minimal", name: "极简", patch: {stylePreset: "minimal"}}, {id: "vibrant", name: "鲜明", patch: {stylePreset: "vibrant"}}],
  migrations: [], preview: {accent: "#FFFFFF", label: "墨染"},
});
