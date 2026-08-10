import {zColor} from "@remotion/zod-types";
import {z} from "zod";
import {defineTemplateManifest} from "../../../packages/template-sdk/src";

export const statCounterSchema = z.object({
  title: z.string().trim().min(1).max(28),
  value: z.number().finite().min(-999_999).max(999_999),
  prefix: z.string().max(8),
  suffix: z.string().max(8),
  source: z.string().trim().max(56),
  decimals: z.number().int().min(0).max(2),
  accentColor: zColor(),
  stylePreset: z.enum(["editorial", "minimal", "sport"]),
});

export type StatCounterProps = z.infer<typeof statCounterSchema>;

export const statCounterManifest = defineTemplateManifest<StatCounterProps>({
  id: "stat-counter",
  compositionId: "StatCounter",
  version: "1.2.0",
  name: "大数字增长",
  category: "data",
  tags: ["数字", "百分比", "增长", "数据"],
  description: "用于突出单个关键数字、百分比或增长指标。",
  schema: statCounterSchema,
  defaultProps: {
    title: "项目增长",
    value: 128.6,
    prefix: "",
    suffix: "%",
    source: "示例数据",
    decimals: 1,
    accentColor: "#47A7FF",
    stylePreset: "editorial",
  },
  fields: [
    {key: "title", label: "标题", section: "content", control: "text", maxLength: 28},
    {key: "value", label: "数值", section: "content", control: "number", min: -999_999, max: 999_999, step: 0.1},
    {key: "prefix", label: "前缀（如 ¥ / $）", section: "content", control: "text", maxLength: 8},
    {key: "suffix", label: "后缀（如 % / 万）", section: "content", control: "text", maxLength: 8},
    {key: "decimals", label: "小数位", section: "content", control: "select", options: [{label: "0 位", value: 0}, {label: "1 位", value: 1}, {label: "2 位", value: 2}]},
    {key: "source", label: "来源", section: "source", control: "text", maxLength: 56},
    {key: "stylePreset", label: "样式预设", section: "style", control: "select", options: [{label: "新闻数据", value: "editorial"}, {label: "极简白线", value: "minimal"}, {label: "高对比体育", value: "sport"}]},
    {key: "accentColor", label: "强调色", section: "style", control: "color"},
  ],
  durationMode: "fixed-edges",
  capabilities: {
    alpha: true,
    audio: false,
    mediaSlots: 0,
    minDurationFrames: 75,
    maxDurationFrames: 18_000,
    supportedAspectRatios: ["16:9", "9:16", "1:1", "custom"],
  },
  stylePresets: [
    {id: "editorial", name: "新闻数据", patch: {stylePreset: "editorial", accentColor: "#47A7FF"}},
    {id: "minimal", name: "极简白线", patch: {stylePreset: "minimal", accentColor: "#F2F4F5"}},
    {id: "sport", name: "高对比体育", patch: {stylePreset: "sport", accentColor: "#B8FF3D"}},
  ],
  migrations: [
    {
      from: "1.0.0",
      to: "1.1.0",
      migrate: (props) => statCounterSchema.parse({...props as object, prefix: "", stylePreset: "editorial"}),
    },
    {
      from: "1.1.0",
      to: "1.2.0",
      migrate: (props) => statCounterSchema.parse({...props as object, prefix: ""}),
    },
  ],
  preview: {accent: "#47A7FF", label: "128.6%"},
});
