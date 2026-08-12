import {zColor} from "@remotion/zod-types";
import {z} from "zod";
import {defineTemplateManifest} from "../../../packages/template-sdk/src";

export const scanline_annotateSchema = z.object({
  items: z.array(z.string().trim().min(1).max(40)).min(1).max(8),
  accentColor: zColor(),
  stylePreset: z.enum(["editorial", "minimal", "vibrant"]),
});
export type ScanlineAnnotateProps = z.infer<typeof scanline_annotateSchema>;

export const scanlineAnnotateManifest = defineTemplateManifest<ScanlineAnnotateProps>({
  id: "scanline-annotate", compositionId: "ScanlineAnnotate", version: "1.0.0", name: "扫描线标注", category: "information",
  tags: ["扫描线", "标注", "取景框", "分析"], description: "亮扫描线纵扫画面，逐块弹出取景框并打出等宽标注。", schema: scanline_annotateSchema,
  defaultProps: {items: ["LOGO · MARK", "H1 · DISPLAY", "CTA · PRIMARY", "MODULE · KINETIC", "FOOTER · LEGAL", "SOCIAL · VOICE"], accentColor: "#9FB6E8", stylePreset: "editorial"},
  fields: [
    {key: "items", label: "标注词", section: "data", control: "data-array", columns: [{key: "label", label: "标注", kind: "text", width: 2}], minItems: 1, maxItems: 8, newItem: {label: "ANNOTATION"}},
    {key: "stylePreset", label: "样式", section: "style", control: "select", options: [{label: "编辑部", value: "editorial"}, {label: "极简", value: "minimal"}, {label: "鲜明", value: "vibrant"}]},
    {key: "accentColor", label: "强调色", section: "style", control: "color"},
  ],
  durationMode: "fixed-edges", capabilities: {alpha: true, audio: false, mediaSlots: 0, minDurationFrames: 150, maxDurationFrames: 18_000, maxItems: 8, supportedAspectRatios: ["16:9", "9:16", "1:1", "custom"]},
  stylePresets: [{id: "editorial", name: "编辑部", patch: {stylePreset: "editorial"}}, {id: "minimal", name: "极简", patch: {stylePreset: "minimal", accentColor: "#FFFFFF"}}, {id: "vibrant", name: "鲜明", patch: {stylePreset: "vibrant", accentColor: "#B8FF3D"}}],
  migrations: [], preview: {accent: "#9FB6E8", label: "⌖ 扫描"},
});
