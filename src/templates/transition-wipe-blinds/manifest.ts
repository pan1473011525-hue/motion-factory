import {zColor} from "@remotion/zod-types";
import {z} from "zod";
import {defineTemplateManifest} from "../../../packages/template-sdk/src";

export const transition_wipe_blindsSchema = z.object({
  title: z.string().trim().min(1).max(48),
  accentColor: zColor(),
  stylePreset: z.enum(["editorial", "minimal", "vibrant"]),
});

export type TransitionWipeBlindsProps = z.infer<typeof transition_wipe_blindsSchema>;

export const transitionWipeBlindsManifest = defineTemplateManifest<TransitionWipeBlindsProps>({
  id: "transition-wipe-blinds", compositionId: "TransitionWipeBlinds", version: "1.0.0", name: "百叶窗遮罩", category: "transition",
  tags: ["百叶窗遮罩"], description: "竖条百叶窗扩张的黑白转场遮罩，配合剪辑软件轨道遮罩键使用。", schema: transition_wipe_blindsSchema,
  defaultProps: {title: "百叶窗遮罩", accentColor: "#47A7FF", stylePreset: "editorial"},
  fields: [
    {key: "title", label: "标题", section: "content", control: "text", maxLength: 48},
    {key: "stylePreset", label: "样式", section: "style", control: "select", options: [{label: "编辑部", value: "editorial"}, {label: "极简", value: "minimal"}, {label: "鲜明", value: "vibrant"}]},
    {key: "accentColor", label: "强调色", section: "style", control: "color"},
  ],
  durationMode: "fixed-edges", capabilities: {alpha: true, audio: false, mediaSlots: 0, minDurationFrames: 75, maxDurationFrames: 18_000, supportedAspectRatios: ["16:9", "9:16", "1:1", "custom"]},
  stylePresets: [{id: "editorial", name: "编辑部", patch: {stylePreset: "editorial"}}, {id: "minimal", name: "极简", patch: {stylePreset: "minimal"}}, {id: "vibrant", name: "鲜明", patch: {stylePreset: "vibrant"}}], migrations: [], preview: {accent: "#FFFFFF", label: "百叶窗"},
});
