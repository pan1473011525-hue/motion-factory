import {Easing} from "remotion";
import type {ComposerEasingPresetId} from "../../packages/project-model/src";

export type ComposerEasingPresetDefinition = {
  id: ComposerEasingPresetId;
  name: string;
  description: string;
  family: "standard" | "emphasis" | "spring";
};

export const composerEasingPresets: ReadonlyArray<ComposerEasingPresetDefinition> = [
  {id: "linear", name: "线性", description: "保持匀速，适合机械运动和连续扫动。", family: "standard"},
  {id: "smooth-in", name: "柔和缓入", description: "慢速起步后逐渐加速，适合退场。", family: "standard"},
  {id: "smooth-out", name: "柔和缓出", description: "快速启动并柔和停下，适合大多数入场。", family: "standard"},
  {id: "smooth-in-out", name: "缓入缓出", description: "两端柔和、中段加速，适合内容变化。", family: "standard"},
  {id: "quad-in", name: "二次方缓入", description: "比柔和缓入更直接的二次加速。", family: "standard"},
  {id: "quad-out", name: "二次方缓出", description: "快速响应后平稳减速。", family: "standard"},
  {id: "quad-in-out", name: "二次方缓入缓出", description: "对称的二次加减速曲线。", family: "standard"},
  {id: "expo-out", name: "指数缓出", description: "前段迅速完成、尾部细腻收住；也是旧项目默认。", family: "emphasis"},
  {id: "back-out", name: "轻微回弹", description: "越过终点后轻微回落，适合强调元素。", family: "emphasis"},
  {id: "spring-smooth", name: "柔和弹簧", description: "阻尼较高、回弹克制的物理曲线。", family: "spring"},
  {id: "spring-snappy", name: "活力弹簧", description: "响应迅速并带明显过冲，适合弹出动效。", family: "spring"},
];

export const getComposerEasingPreset = (id: ComposerEasingPresetId): ComposerEasingPresetDefinition => {
  const preset = composerEasingPresets.find((candidate) => candidate.id === id);
  if (!preset) throw new Error(`未知的动画曲线：${id}`);
  return preset;
};

export const getComposerEasingFunction = (id: ComposerEasingPresetId): ((progress: number) => number) => {
  if (id === "linear") return Easing.linear;
  if (id === "smooth-in") return Easing.in(Easing.cubic);
  if (id === "smooth-out") return Easing.out(Easing.cubic);
  if (id === "smooth-in-out") return Easing.inOut(Easing.cubic);
  if (id === "quad-in") return Easing.in(Easing.quad);
  if (id === "quad-out") return Easing.out(Easing.quad);
  if (id === "quad-in-out") return Easing.inOut(Easing.quad);
  if (id === "expo-out") return Easing.bezier(0.16, 1, 0.3, 1);
  if (id === "back-out") return Easing.out(Easing.back(1.35));
  if (id === "spring-smooth") return Easing.spring({damping: 28, stiffness: 110, mass: 0.9, durationRestThreshold: 0.001});
  return Easing.spring({damping: 13, stiffness: 170, mass: 0.8, durationRestThreshold: 0.001});
};
