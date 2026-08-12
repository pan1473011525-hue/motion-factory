import {zColor} from "@remotion/zod-types";
import {z} from "zod";
import {defineTemplateManifest} from "../../../packages/template-sdk/src";

export const voice_waveformSchema = z.object({
  barCount: z.number().int().min(16).max(128),
  accentColor: zColor(),
  stylePreset: z.enum(["editorial", "minimal", "vibrant"]),
});
export type VoiceWaveformProps = z.infer<typeof voice_waveformSchema>;

export const voiceWaveformManifest = defineTemplateManifest<VoiceWaveformProps>({
  id: "voice-waveform", compositionId: "VoiceWaveform", version: "1.0.0", name: "语音波形", category: "chart",
  tags: ["声纹", "波形", "语音", "播客"], description: "录音胶囊内实时滚动声纹，说话起伏、停顿点线、提交塌缩。", schema: voice_waveformSchema,
  defaultProps: {barCount: 64, accentColor: "#47A7FF", stylePreset: "editorial"},
  fields: [
    {key: "barCount", label: "声纹条数", section: "layout", control: "number", min: 16, max: 128, step: 1},
    {key: "stylePreset", label: "样式", section: "style", control: "select", options: [{label: "编辑部", value: "editorial"}, {label: "极简", value: "minimal"}, {label: "鲜明", value: "vibrant"}]},
    {key: "accentColor", label: "声纹颜色", section: "style", control: "color"},
  ],
  durationMode: "fixed-edges", capabilities: {alpha: true, audio: false, mediaSlots: 0, minDurationFrames: 150, maxDurationFrames: 18_000, supportedAspectRatios: ["16:9", "9:16", "1:1", "custom"]},
  stylePresets: [{id: "editorial", name: "编辑部", patch: {stylePreset: "editorial"}}, {id: "minimal", name: "极简", patch: {stylePreset: "minimal", accentColor: "#FFFFFF"}}, {id: "vibrant", name: "鲜明", patch: {stylePreset: "vibrant", accentColor: "#B8FF3D"}}],
  migrations: [], preview: {accent: "#47A7FF", label: "声纹"},
});
