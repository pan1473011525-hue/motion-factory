import {zColor} from "@remotion/zod-types";
import {z} from "zod";
import {defineTemplateManifest} from "../../../packages/template-sdk/src";
export const quoteCardSchema = z.object({quote: z.string().min(1).max(180), person: z.string().max(28), role: z.string().max(48), avatarAssetId: z.string(), accentColor: zColor(), stylePreset: z.enum(["editorial", "minimal", "vibrant"])});
export type QuoteCardProps = z.infer<typeof quoteCardSchema>;
export const quoteCardManifest = defineTemplateManifest<QuoteCardProps>({
  id: "quote-card", compositionId: "QuoteCard", version: "1.0.0", name: "引语卡", category: "information", tags: ["引语", "人物", "采访", "头像"], description: "突出采访金句、人物姓名与职务，可选头像。", schema: quoteCardSchema,
  defaultProps: {quote: "真正有价值的数据，不只是给出答案，还应该帮助我们提出更好的问题。", person: "林默", role: "数据新闻编辑", avatarAssetId: "", accentColor: "#47A7FF", stylePreset: "editorial"},
  fields: [{key: "quote", label: "引语", section: "content", control: "textarea", maxLength: 180, rows: 5}, {key: "person", label: "人物", section: "content", control: "text", maxLength: 28}, {key: "role", label: "职务 / 身份", section: "content", control: "text", maxLength: 48}, {key: "avatarAssetId", label: "人物头像", section: "data", control: "media", accept: ["image"]}, {key: "stylePreset", label: "样式预设", section: "style", control: "select", options: [{label: "访谈", value: "editorial"}, {label: "极简引语", value: "minimal"}, {label: "醒目金句", value: "vibrant"}]}, {key: "accentColor", label: "强调色", section: "style", control: "color"}], durationMode: "fixed-edges", capabilities: {alpha: true, audio: false, mediaSlots: 1, minDurationFrames: 90, maxDurationFrames: 18_000, supportedAspectRatios: ["16:9", "9:16", "1:1", "custom"]}, stylePresets: [{id: "editorial", name: "访谈", patch: {stylePreset: "editorial"}}, {id: "minimal", name: "极简引语", patch: {stylePreset: "minimal"}}, {id: "vibrant", name: "醒目金句", patch: {stylePreset: "vibrant", accentColor: "#F5D547"}}], migrations: [], preview: {accent: "#F5D547", label: "“ ”"},
});
