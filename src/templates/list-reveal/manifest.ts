import {zColor} from "@remotion/zod-types";
import {z} from "zod";
import {defineTemplateManifest} from "../../../packages/template-sdk/src";

export const list_revealSchema = z.object({
  items: z.array(z.string().trim().min(1).max(30)).min(1).max(12),
  fontSize: z.number().min(12).max(80),
  accentColor: zColor(),
  stylePreset: z.enum(["editorial", "minimal", "vibrant"]),
});
export type ListRevealProps = z.infer<typeof list_revealSchema>;

export const listRevealManifest = defineTemplateManifest<ListRevealProps>({
  id: "list-reveal", compositionId: "ListReveal", version: "1.0.0", name: "列表逐项", category: "information",
  tags: ["列表", "逐项", "菜单", "入场"], description: "菜单列表逐项弹入并整体缓慢漂移的入场动画。", schema: list_revealSchema,
  defaultProps: {items: ["Dashboard", "Projects", "Analytics", "Messages", "Settings", "Sign out"], fontSize: 24, accentColor: "#47A7FF", stylePreset: "editorial"},
  fields: [
    {key: "items", label: "列表项", section: "data", control: "data-array", columns: [{key: "label", label: "文案", kind: "text", width: 2}], minItems: 1, maxItems: 12, newItem: {label: "新项目"}},
    {key: "fontSize", label: "字号", section: "style", control: "number", min: 12, max: 80, step: 1, unit: "px"},
    {key: "stylePreset", label: "样式", section: "style", control: "select", options: [{label: "编辑部", value: "editorial"}, {label: "极简", value: "minimal"}, {label: "鲜明", value: "vibrant"}]},
    {key: "accentColor", label: "强调色", section: "style", control: "color"},
  ],
  durationMode: "fixed-edges", capabilities: {alpha: true, audio: false, mediaSlots: 0, minDurationFrames: 130, maxDurationFrames: 18_000, maxItems: 12, supportedAspectRatios: ["16:9", "9:16", "1:1", "custom"]},
  stylePresets: [{id: "editorial", name: "编辑部", patch: {stylePreset: "editorial"}}, {id: "minimal", name: "极简", patch: {stylePreset: "minimal", accentColor: "#FFFFFF"}}, {id: "vibrant", name: "鲜明", patch: {stylePreset: "vibrant", accentColor: "#B8FF3D"}}],
  migrations: [], preview: {accent: "#47A7FF", label: "☰ 列表"},
});
