import {zColor} from "@remotion/zod-types";
import {z} from "zod";
import {defineTemplateManifest} from "../../../packages/template-sdk/src";

export const skeleton_revealSchema = z.object({
  items: z.array(z.object({name: z.string().trim().min(1).max(20), message: z.string().trim().min(1).max(80)})).min(1).max(4),
  accentColor: zColor(),
  stylePreset: z.enum(["editorial", "minimal", "vibrant"]),
});
export type SkeletonRevealProps = z.infer<typeof skeleton_revealSchema>;

export const skeletonRevealManifest = defineTemplateManifest<SkeletonRevealProps>({
  id: "skeleton-reveal", compositionId: "SkeletonReveal", version: "1.0.0", name: "骨架屏加载", category: "information",
  tags: ["骨架屏", "加载", "聊天", "显影"], description: "手绘涂鸦煮沸后替换为骨架窗口，内容逐行逐词显影。", schema: skeleton_revealSchema,
  defaultProps: {items: [
    {name: "Ana", message: "Morning! Kicking off the rebrand today"},
    {name: "Ben", message: "Logo drafts are ready for review"},
    {name: "Kai", message: "Nice — shipping the deck this afternoon"},
    {name: "Mia", message: "Love it. Can we make it pink?"},
  ], accentColor: "#47A7FF", stylePreset: "editorial"},
  fields: [
    {key: "items", label: "消息列表", section: "data", control: "data-array", columns: [{key: "name", label: "昵称", kind: "text", width: 0.8}, {key: "message", label: "消息", kind: "text", width: 2.4}], minItems: 1, maxItems: 4, newItem: {name: "新成员", message: "输入消息内容"}},
    {key: "stylePreset", label: "样式", section: "style", control: "select", options: [{label: "编辑部", value: "editorial"}, {label: "极简", value: "minimal"}, {label: "鲜明", value: "vibrant"}]},
    {key: "accentColor", label: "头像颜色", section: "style", control: "color"},
  ],
  durationMode: "fixed-edges", capabilities: {alpha: true, audio: false, mediaSlots: 0, minDurationFrames: 150, maxDurationFrames: 18_000, maxItems: 4, supportedAspectRatios: ["16:9", "9:16", "1:1", "custom"]},
  stylePresets: [{id: "editorial", name: "编辑部", patch: {stylePreset: "editorial"}}, {id: "minimal", name: "极简", patch: {stylePreset: "minimal", accentColor: "#FFFFFF"}}, {id: "vibrant", name: "鲜明", patch: {stylePreset: "vibrant", accentColor: "#B8FF3D"}}],
  migrations: [], preview: {accent: "#47A7FF", label: "骨架"},
});
