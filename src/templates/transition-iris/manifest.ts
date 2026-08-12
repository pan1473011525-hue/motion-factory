import {z} from "zod";
import {defineTemplateManifest} from "../../../packages/template-sdk/src";

export const transition_irisSchema = z.object({
  centerX: z.number().min(0).max(100),
  centerY: z.number().min(0).max(100),
  edgeSoftness: z.number().min(0).max(100),
  stylePreset: z.enum(["editorial", "minimal", "vibrant"]),
});
export type TransitionIrisProps = z.infer<typeof transition_irisSchema>;

export const transitionIrisManifest = defineTemplateManifest<TransitionIrisProps>({
  id: "transition-iris", compositionId: "TransitionIris", version: "1.0.0", name: "圆形光圈遮罩", category: "transition",
  tags: ["转场", "光圈", "圆形", "遮罩"], description: "圆形光圈扩张的黑白转场遮罩，从指定中心扩散。", schema: transition_irisSchema,
  defaultProps: {centerX: 50, centerY: 50, edgeSoftness: 8, stylePreset: "editorial"},
  fields: [
    {key: "centerX", label: "圆心 X", section: "layout", control: "number", min: 0, max: 100, step: 1, unit: "%"},
    {key: "centerY", label: "圆心 Y", section: "layout", control: "number", min: 0, max: 100, step: 1, unit: "%"},
    {key: "edgeSoftness", label: "边缘柔化", section: "style", control: "number", min: 0, max: 100, step: 1, unit: "%"},
    {key: "stylePreset", label: "样式", section: "style", control: "select", options: [{label: "编辑部", value: "editorial"}, {label: "极简", value: "minimal"}, {label: "鲜明", value: "vibrant"}]},
  ],
  durationMode: "fixed-edges", capabilities: {alpha: true, audio: false, mediaSlots: 0, minDurationFrames: 75, maxDurationFrames: 18_000, supportedAspectRatios: ["16:9", "9:16", "1:1", "custom"]},
  stylePresets: [{id: "editorial", name: "编辑部", patch: {stylePreset: "editorial"}}, {id: "minimal", name: "极简", patch: {stylePreset: "minimal"}}, {id: "vibrant", name: "鲜明", patch: {stylePreset: "vibrant"}}],
  migrations: [], preview: {accent: "#FFFFFF", label: "光圈"},
});
