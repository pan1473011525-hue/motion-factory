import {z} from "zod";
import {defineTemplateManifest} from "../../../packages/template-sdk/src";

export const transition_glitchSchema = z.object({
  barCount: z.number().int().min(4).max(64),
  intensity: z.number().min(0).max(2),
  edgeSoftness: z.number().min(0).max(100),
  stylePreset: z.enum(["editorial", "minimal", "vibrant"]),
});
export type TransitionGlitchProps = z.infer<typeof transition_glitchSchema>;

export const transitionGlitchManifest = defineTemplateManifest<TransitionGlitchProps>({
  id: "transition-glitch", compositionId: "TransitionGlitch", version: "1.0.0", name: "撕裂故障遮罩", category: "transition",
  tags: ["转场", "故障", "撕裂", "遮罩"], description: "撕裂故障感的黑白转场遮罩，横条错位分块切换。", schema: transition_glitchSchema,
  defaultProps: {barCount: 16, intensity: 1, edgeSoftness: 8, stylePreset: "editorial"},
  fields: [
    {key: "barCount", label: "条数", section: "layout", control: "number", min: 4, max: 64, step: 1},
    {key: "intensity", label: "抖动强度", section: "layout", control: "number", min: 0, max: 2, step: 0.1},
    {key: "edgeSoftness", label: "边缘柔化", section: "style", control: "number", min: 0, max: 100, step: 1, unit: "%"},
    {key: "stylePreset", label: "样式", section: "style", control: "select", options: [{label: "编辑部", value: "editorial"}, {label: "极简", value: "minimal"}, {label: "鲜明", value: "vibrant"}]},
  ],
  durationMode: "fixed-edges", capabilities: {alpha: true, audio: false, mediaSlots: 0, minDurationFrames: 75, maxDurationFrames: 18_000, supportedAspectRatios: ["16:9", "9:16", "1:1", "custom"]},
  stylePresets: [{id: "editorial", name: "编辑部", patch: {stylePreset: "editorial"}}, {id: "minimal", name: "极简", patch: {stylePreset: "minimal"}}, {id: "vibrant", name: "鲜明", patch: {stylePreset: "vibrant"}}],
  migrations: [], preview: {accent: "#FFFFFF", label: "撕裂"},
});
