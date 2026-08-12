import {zColor} from "@remotion/zod-types";
import {z} from "zod";
import {defineTemplateManifest} from "../../../packages/template-sdk/src";

export const odometer_rollSchema = z.object({
  value: z.number().min(0).max(99999.99),
  decimals: z.number().int().min(0).max(2),
  prefix: z.string().max(8),
  suffix: z.string().max(8),
  label: z.string().max(40),
  fontSize: z.number().min(60).max(400),
  color: zColor(),
  accentColor: zColor(),
  stylePreset: z.enum(["editorial", "minimal", "vibrant"]),
});
export type OdometerRollProps = z.infer<typeof odometer_rollSchema>;

export const odometerRollManifest = defineTemplateManifest<OdometerRollProps>({
  id: "odometer-roll", compositionId: "OdometerRoll", version: "1.0.0", name: "里程表数字", category: "data",
  tags: ["里程表", "数字", "滚动", "计数器"], description: "多位数逐格滚动停稳的里程表式数字动画。", schema: odometer_rollSchema,
  defaultProps: {value: 9998, decimals: 0, prefix: "", suffix: "%", label: "ODOMETER DIGIT ROLL", fontSize: 190, color: "#F4F7FB", accentColor: "#47A7FF", stylePreset: "editorial"},
  fields: [
    {key: "value", label: "数值", section: "data", control: "number", step: 0.01},
    {key: "decimals", label: "小数位", section: "data", control: "number", min: 0, max: 2, step: 1},
    {key: "prefix", label: "前缀", section: "content", control: "text", maxLength: 8},
    {key: "suffix", label: "后缀", section: "content", control: "text", maxLength: 8},
    {key: "label", label: "标签", section: "content", control: "text", maxLength: 40},
    {key: "fontSize", label: "字号", section: "style", control: "number", min: 60, max: 400, step: 1, unit: "px"},
    {key: "color", label: "数字颜色", section: "style", control: "color"},
    {key: "stylePreset", label: "样式", section: "style", control: "select", options: [{label: "编辑部", value: "editorial"}, {label: "极简", value: "minimal"}, {label: "鲜明", value: "vibrant"}]},
    {key: "accentColor", label: "强调色", section: "style", control: "color"},
  ],
  durationMode: "fixed-edges", capabilities: {alpha: true, audio: false, mediaSlots: 0, minDurationFrames: 150, maxDurationFrames: 18_000, supportedAspectRatios: ["16:9", "9:16", "1:1", "custom"]},
  stylePresets: [{id: "editorial", name: "编辑部", patch: {stylePreset: "editorial"}}, {id: "minimal", name: "极简", patch: {stylePreset: "minimal", accentColor: "#FFFFFF"}}, {id: "vibrant", name: "鲜明", patch: {stylePreset: "vibrant", accentColor: "#B8FF3D"}}],
  migrations: [], preview: {accent: "#47A7FF", label: "里程表"},
});
