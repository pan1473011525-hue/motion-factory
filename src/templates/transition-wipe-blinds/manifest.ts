import {z} from "zod";
import {defineTemplateManifest} from "../../../packages/template-sdk/src";

export const transition_wipe_blindsSchema = z.object({
  stripCount: z.number().int().min(4).max(48),
  direction: z.enum(["vertical", "horizontal"]),
  edgeSoftness: z.number().min(0).max(100),
  stylePreset: z.enum(["editorial", "minimal", "vibrant"]),
});
export type TransitionWipeBlindsProps = z.infer<typeof transition_wipe_blindsSchema>;

export const transitionWipeBlindsManifest = defineTemplateManifest<TransitionWipeBlindsProps>({
  id: "transition-wipe-blinds", compositionId: "TransitionWipeBlinds", version: "1.0.0", name: "百叶窗遮罩", category: "transition",
  tags: ["转场", "百叶窗", "擦除", "遮罩"], description: "竖条百叶窗扩张的黑白转场遮罩，配合剪辑软件轨道遮罩键使用。", schema: transition_wipe_blindsSchema,
  defaultProps: {stripCount: 12, direction: "vertical", edgeSoftness: 8, stylePreset: "editorial"},
  fields: [
    {key: "stripCount", label: "条数", section: "layout", control: "number", min: 4, max: 48, step: 1},
    {key: "direction", label: "展开方向", section: "layout", control: "select", options: [{label: "竖向条 / 向左扩", value: "vertical"}, {label: "横向条 / 向下扩", value: "horizontal"}]},
    {key: "edgeSoftness", label: "边缘柔化", section: "style", control: "number", min: 0, max: 100, step: 1, unit: "%"},
    {key: "stylePreset", label: "样式", section: "style", control: "select", options: [{label: "编辑部", value: "editorial"}, {label: "极简", value: "minimal"}, {label: "鲜明", value: "vibrant"}]},
  ],
  durationMode: "fixed-edges", capabilities: {alpha: true, audio: false, mediaSlots: 0, minDurationFrames: 75, maxDurationFrames: 18_000, supportedAspectRatios: ["16:9", "9:16", "1:1", "custom"]},
  stylePresets: [{id: "editorial", name: "编辑部", patch: {stylePreset: "editorial"}}, {id: "minimal", name: "极简", patch: {stylePreset: "minimal"}}, {id: "vibrant", name: "鲜明", patch: {stylePreset: "vibrant"}}],
  migrations: [], preview: {accent: "#FFFFFF", label: "百叶窗"},
});
