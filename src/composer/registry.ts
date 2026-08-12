import {z, type ZodType} from "zod";
import type {
  ComposerComponentId,
  ComposerComposition,
  ComposerMotionPresetId,
  ComposerNode,
  ProjectAsset,
} from "../../packages/project-model/src";
import type {InspectorField} from "../../packages/template-sdk/src";

export type ComposerComponentCategory = "text" | "shape" | "data" | "media" | "layout";

export type ComposerComponentDefinition = {
  id: ComposerComponentId;
  name: string;
  category: ComposerComponentCategory;
  description: string;
  preview: string;
  defaultSize: {width: number; height: number};
  defaultProps: Record<string, unknown>;
  schema: ZodType<Record<string, unknown>>;
  fields: ReadonlyArray<InspectorField>;
};

const color = z.string().min(1).max(64);
const textAlign = z.enum(["left", "center", "right"]);
const objectFit = z.enum(["cover", "contain", "fill"]);

export const composerComponents: ReadonlyArray<ComposerComponentDefinition> = [
  {
    id: "title", name: "标题", category: "text", description: "用于主标题与章节标题。", preview: "Aa",
    defaultSize: {width: 0.58, height: 0.18},
    defaultProps: {text: "在这里输入标题", color: "#F4F7FB", fontSize: 96, fontWeight: 720, align: "left"},
    schema: z.object({text: z.string().max(200), color, fontSize: z.number().min(12).max(600), fontWeight: z.number().min(100).max(900), align: textAlign}),
    fields: [
      {key: "text", label: "文字", section: "content", control: "textarea", rows: 3, maxLength: 200},
      {key: "fontSize", label: "字号", section: "style", control: "number", min: 12, max: 600, step: 1, unit: "px"},
      {key: "fontWeight", label: "字重", section: "style", control: "number", min: 100, max: 900, step: 10},
      {key: "align", label: "对齐", section: "layout", control: "select", options: [{label: "左", value: "left"}, {label: "中", value: "center"}, {label: "右", value: "right"}]},
      {key: "color", label: "颜色", section: "style", control: "color"},
    ],
  },
  {
    id: "body-text", name: "正文", category: "text", description: "多行说明、引用出处或注释。", preview: "¶",
    defaultSize: {width: 0.48, height: 0.22},
    defaultProps: {text: "输入说明文字。", color: "#D4DAE3", fontSize: 42, fontWeight: 440, align: "left", lineHeight: 1.35},
    schema: z.object({text: z.string().max(1_000), color, fontSize: z.number().min(10).max(300), fontWeight: z.number().min(100).max(900), align: textAlign, lineHeight: z.number().min(0.8).max(3)}),
    fields: [
      {key: "text", label: "正文", section: "content", control: "textarea", rows: 5, maxLength: 1_000},
      {key: "fontSize", label: "字号", section: "style", control: "number", min: 10, max: 300, step: 1, unit: "px"},
      {key: "fontWeight", label: "字重", section: "style", control: "number", min: 100, max: 900, step: 10},
      {key: "lineHeight", label: "行高", section: "style", control: "number", min: 0.8, max: 3, step: 0.05},
      {key: "align", label: "对齐", section: "layout", control: "select", options: [{label: "左", value: "left"}, {label: "中", value: "center"}, {label: "右", value: "right"}]},
      {key: "color", label: "颜色", section: "style", control: "color"},
    ],
  },
  {
    id: "stat-number", name: "数据数字", category: "data", description: "带前后缀和标签的动态数字。", preview: "42%",
    defaultSize: {width: 0.36, height: 0.24},
    defaultProps: {value: 72.4, decimals: 1, prefix: "", suffix: "%", label: "完成率", color: "#47A7FF"},
    schema: z.object({value: z.number(), decimals: z.number().int().min(0).max(6), prefix: z.string().max(16), suffix: z.string().max(16), label: z.string().max(80), color}),
    fields: [
      {key: "value", label: "数值", section: "data", control: "number", step: 0.1},
      {key: "decimals", label: "小数位", section: "data", control: "number", min: 0, max: 6, step: 1},
      {key: "prefix", label: "前缀", section: "content", control: "text", maxLength: 16},
      {key: "suffix", label: "后缀", section: "content", control: "text", maxLength: 16},
      {key: "label", label: "标签", section: "content", control: "text", maxLength: 80},
      {key: "color", label: "强调色", section: "style", control: "color"},
    ],
  },
  {
    id: "rectangle", name: "矩形", category: "shape", description: "色块、底板与遮罩容器。", preview: "▰",
    defaultSize: {width: 0.34, height: 0.24},
    defaultProps: {fill: "#242B35", borderColor: "#667181", borderWidth: 0, radius: 24},
    schema: z.object({fill: color, borderColor: color, borderWidth: z.number().min(0).max(80), radius: z.number().min(0).max(500)}),
    fields: [
      {key: "fill", label: "填充", section: "style", control: "color"},
      {key: "borderColor", label: "描边", section: "style", control: "color"},
      {key: "borderWidth", label: "描边宽度", section: "style", control: "number", min: 0, max: 80, step: 1, unit: "px"},
      {key: "radius", label: "圆角", section: "style", control: "number", min: 0, max: 500, step: 1, unit: "px"},
    ],
  },
  {
    id: "ellipse", name: "圆形", category: "shape", description: "圆点、圆环与几何装饰。", preview: "●",
    defaultSize: {width: 0.16, height: 0.28},
    defaultProps: {fill: "#47A7FF", borderColor: "#EAF4FF", borderWidth: 0},
    schema: z.object({fill: color, borderColor: color, borderWidth: z.number().min(0).max(80)}),
    fields: [
      {key: "fill", label: "填充", section: "style", control: "color"},
      {key: "borderColor", label: "描边", section: "style", control: "color"},
      {key: "borderWidth", label: "描边宽度", section: "style", control: "number", min: 0, max: 80, step: 1, unit: "px"},
    ],
  },
  {
    id: "divider", name: "分隔线", category: "shape", description: "标题下划线与版面分隔。", preview: "━",
    defaultSize: {width: 0.48, height: 0.025},
    defaultProps: {color: "#47A7FF", thickness: 8, direction: "horizontal"},
    schema: z.object({color, thickness: z.number().min(1).max(120), direction: z.enum(["horizontal", "vertical"])}),
    fields: [
      {key: "direction", label: "方向", section: "layout", control: "select", options: [{label: "水平", value: "horizontal"}, {label: "垂直", value: "vertical"}]},
      {key: "thickness", label: "粗细", section: "style", control: "number", min: 1, max: 120, step: 1, unit: "px"},
      {key: "color", label: "颜色", section: "style", control: "color"},
    ],
  },
  {
    id: "image", name: "图片", category: "media", description: "照片、截图、Logo 或透明 PNG。", preview: "IMG",
    defaultSize: {width: 0.42, height: 0.42},
    defaultProps: {assetId: "", fit: "cover", radius: 0},
    schema: z.object({assetId: z.string(), fit: objectFit, radius: z.number().min(0).max(500)}),
    fields: [
      {key: "assetId", label: "图片素材", section: "content", control: "media", accept: ["image"]},
      {key: "fit", label: "适应方式", section: "layout", control: "select", options: [{label: "填满裁切", value: "cover"}, {label: "完整显示", value: "contain"}, {label: "拉伸", value: "fill"}]},
      {key: "radius", label: "圆角", section: "style", control: "number", min: 0, max: 500, step: 1, unit: "px"},
    ],
  },
  {
    id: "video", name: "视频", category: "media", description: "可循环、调速的静音视频层。", preview: "PLAY",
    defaultSize: {width: 0.5, height: 0.5},
    defaultProps: {assetId: "", fit: "cover", radius: 0, playbackRate: 1, loop: true, trimBeforeFrames: 0},
    schema: z.object({assetId: z.string(), fit: objectFit, radius: z.number().min(0).max(500), playbackRate: z.number().min(0.1).max(4), loop: z.boolean(), trimBeforeFrames: z.number().int().min(0).max(216_000)}),
    fields: [
      {key: "assetId", label: "视频素材", section: "content", control: "media", accept: ["video"]},
      {key: "fit", label: "适应方式", section: "layout", control: "select", options: [{label: "填满裁切", value: "cover"}, {label: "完整显示", value: "contain"}, {label: "拉伸", value: "fill"}]},
      {key: "playbackRate", label: "播放速度", section: "animation", control: "number", min: 0.1, max: 4, step: 0.05},
      {key: "trimBeforeFrames", label: "入点", section: "animation", control: "number", min: 0, max: 216_000, step: 1, unit: "帧"},
      {key: "loop", label: "循环", section: "animation", control: "boolean"},
      {key: "radius", label: "圆角", section: "style", control: "number", min: 0, max: 500, step: 1, unit: "px"},
    ],
  },
  {
    id: "quote", name: "引语", category: "text", description: "采访金句与人物署名。", preview: "“ ”",
    defaultSize: {width: 0.52, height: 0.3},
    defaultProps: {quote: "真正重要的信息，应该被清楚地看见。", author: "受访者", role: "身份 / 机构", color: "#F4F7FB", accentColor: "#47A7FF"},
    schema: z.object({quote: z.string().max(500), author: z.string().max(80), role: z.string().max(120), color, accentColor: color}),
    fields: [
      {key: "quote", label: "引语", section: "content", control: "textarea", rows: 4, maxLength: 500},
      {key: "author", label: "姓名", section: "content", control: "text", maxLength: 80},
      {key: "role", label: "身份", section: "source", control: "text", maxLength: 120},
      {key: "color", label: "文字颜色", section: "style", control: "color"},
      {key: "accentColor", label: "强调色", section: "style", control: "color"},
    ],
  },
  {
    id: "badge", name: "标签", category: "layout", description: "栏目、分类与状态短标签。", preview: "TAG",
    defaultSize: {width: 0.18, height: 0.08},
    defaultProps: {text: "栏目标签", textColor: "#F4F7FB", backgroundColor: "#276FA8", radius: 999, fontSize: 34},
    schema: z.object({text: z.string().max(80), textColor: color, backgroundColor: color, radius: z.number().min(0).max(999), fontSize: z.number().min(10).max(200)}),
    fields: [
      {key: "text", label: "文字", section: "content", control: "text", maxLength: 80},
      {key: "fontSize", label: "字号", section: "style", control: "number", min: 10, max: 200, step: 1},
      {key: "textColor", label: "文字颜色", section: "style", control: "color"},
      {key: "backgroundColor", label: "背景颜色", section: "style", control: "color"},
      {key: "radius", label: "圆角", section: "style", control: "number", min: 0, max: 999, step: 1},
    ],
  },
  {
    id: "progress", name: "进度条", category: "data", description: "比例、完成度和进程展示。", preview: "72%",
    defaultSize: {width: 0.46, height: 0.14},
    defaultProps: {value: 72, label: "项目进度", showValue: true, accentColor: "#47A7FF", trackColor: "#323B47"},
    schema: z.object({value: z.number().min(0).max(100), label: z.string().max(100), showValue: z.boolean(), accentColor: color, trackColor: color}),
    fields: [
      {key: "value", label: "百分比", section: "data", control: "number", min: 0, max: 100, step: 0.1, unit: "%"},
      {key: "label", label: "标签", section: "content", control: "text", maxLength: 100},
      {key: "showValue", label: "显示数值", section: "layout", control: "boolean"},
      {key: "accentColor", label: "进度颜色", section: "style", control: "color"},
      {key: "trackColor", label: "轨道颜色", section: "style", control: "color"},
    ],
  },
  {
    id: "callout", name: "注释卡", category: "layout", description: "带标题的说明卡与画面批注。", preview: "NOTE",
    defaultSize: {width: 0.36, height: 0.25},
    defaultProps: {title: "关键信息", body: "在这里补充说明。", textColor: "#F4F7FB", backgroundColor: "#222A34", accentColor: "#47A7FF", radius: 20},
    schema: z.object({title: z.string().max(100), body: z.string().max(400), textColor: color, backgroundColor: color, accentColor: color, radius: z.number().min(0).max(200)}),
    fields: [
      {key: "title", label: "标题", section: "content", control: "text", maxLength: 100},
      {key: "body", label: "说明", section: "content", control: "textarea", rows: 4, maxLength: 400},
      {key: "textColor", label: "文字颜色", section: "style", control: "color"},
      {key: "backgroundColor", label: "背景颜色", section: "style", control: "color"},
      {key: "accentColor", label: "强调色", section: "style", control: "color"},
      {key: "radius", label: "圆角", section: "style", control: "number", min: 0, max: 200, step: 1},
    ],
  },
  {
    id: "lower-third", name: "人名条", category: "layout", description: "采访人物姓名与身份。", preview: "NAME",
    defaultSize: {width: 0.46, height: 0.18},
    defaultProps: {name: "人物姓名", role: "职务 / 机构", accentColor: "#47A7FF", textColor: "#F4F7FB", align: "left"},
    schema: z.object({name: z.string().max(100), role: z.string().max(160), accentColor: color, textColor: color, align: textAlign}),
    fields: [
      {key: "name", label: "姓名", section: "content", control: "text", maxLength: 100},
      {key: "role", label: "职务 / 机构", section: "content", control: "text", maxLength: 160},
      {key: "align", label: "对齐", section: "layout", control: "select", options: [{label: "左", value: "left"}, {label: "中", value: "center"}, {label: "右", value: "right"}]},
      {key: "textColor", label: "文字颜色", section: "style", control: "color"},
      {key: "accentColor", label: "强调色", section: "style", control: "color"},
    ],
  },
  {
    id: "bar-chart", name: "迷你柱图", category: "data", description: "轻量类目比较图。", preview: "▂▅▇",
    defaultSize: {width: 0.5, height: 0.4},
    defaultProps: {title: "类目对比", labels: "A,B,C,D", values: "28,52,76,43", accentColor: "#47A7FF", textColor: "#F4F7FB", showValues: true},
    schema: z.object({title: z.string().max(100), labels: z.string().max(500), values: z.string().max(500), accentColor: color, textColor: color, showValues: z.boolean()}),
    fields: [
      {key: "title", label: "标题", section: "content", control: "text", maxLength: 100},
      {key: "labels", label: "类目（逗号分隔）", section: "data", control: "text", maxLength: 500},
      {key: "values", label: "数值（逗号分隔）", section: "data", control: "text", maxLength: 500},
      {key: "showValues", label: "显示数值", section: "layout", control: "boolean"},
      {key: "textColor", label: "文字颜色", section: "style", control: "color"},
      {key: "accentColor", label: "柱形颜色", section: "style", control: "color"},
    ],
  },
  {
    id: "list-reveal", name: "列表逐项", category: "data", description: "菜单列表逐项弹入的入场动画。", preview: "☰",
    defaultSize: {width: 0.5, height: 0.62},
    defaultProps: {items: "Dashboard,Projects,Analytics,Messages,Settings", fontSize: 24, accentColor: "#47A7FF", textColor: "#F4F7FB"},
    schema: z.object({items: z.string().max(500), fontSize: z.number().min(12).max(80), accentColor: color, textColor: color}),
    fields: [
      {key: "items", label: "列表项（逗号分隔）", section: "data", control: "text", maxLength: 500},
      {key: "fontSize", label: "字号", section: "style", control: "number", min: 12, max: 80, step: 1, unit: "px"},
      {key: "textColor", label: "文字颜色", section: "style", control: "color"},
      {key: "accentColor", label: "强调色", section: "style", control: "color"},
    ],
  },
  {
    id: "card-stack", name: "卡片堆叠", category: "layout", description: "多张卡片弹入后呈 3D 扇形展开。", preview: "🃏",
    defaultSize: {width: 0.55, height: 0.55},
    defaultProps: {count: 8, accentColor: "#47A7FF"},
    schema: z.object({count: z.number().int().min(4).max(12), accentColor: color}),
    fields: [
      {key: "count", label: "卡片数", section: "layout", control: "number", min: 4, max: 12, step: 1},
      {key: "accentColor", label: "卡片色", section: "style", control: "color"},
    ],
  },
  {
    id: "skeleton-reveal", name: "骨架屏", category: "layout", description: "骨架占位逐行显影为内容的加载动画。", preview: "☷",
    defaultSize: {width: 0.62, height: 0.5},
    defaultProps: {lines: "第一行标题文字,第二行说明文字,第三行补充文字", accentColor: "#47A7FF", textColor: "#F4F7FB"},
    schema: z.object({lines: z.string().max(500), accentColor: color, textColor: color}),
    fields: [
      {key: "lines", label: "内容行（逗号分隔）", section: "data", control: "text", maxLength: 500},
      {key: "textColor", label: "文字颜色", section: "style", control: "color"},
      {key: "accentColor", label: "头像/强调色", section: "style", control: "color"},
    ],
  },
  {
    id: "svg-trace", name: "SVG描边", category: "shape", description: "卡片轮廓描边生长后内容淡入。", preview: "▢",
    defaultSize: {width: 0.55, height: 0.4},
    defaultProps: {title: "标题文字", subtitle: "副标题说明", fontSize: 30, accentColor: "#F7F9FB", textColor: "#F4F7FB"},
    schema: z.object({title: z.string().max(60), subtitle: z.string().max(100), fontSize: z.number().min(12).max(60), accentColor: color, textColor: color}),
    fields: [
      {key: "title", label: "标题", section: "content", control: "text", maxLength: 60},
      {key: "subtitle", label: "副标题", section: "content", control: "text", maxLength: 100},
      {key: "fontSize", label: "标题字号", section: "style", control: "number", min: 12, max: 60, step: 1, unit: "px"},
      {key: "textColor", label: "文字颜色", section: "style", control: "color"},
      {key: "accentColor", label: "描边颜色", section: "style", control: "color"},
    ],
  },
  {
    id: "odometer-roll", name: "里程表数字", category: "data", description: "多位数逐格滚动停稳的数字动画。", preview: "123",
    defaultSize: {width: 0.5, height: 0.32},
    defaultProps: {value: 128, decimals: 0, suffix: "%", color: "#F4F7FB", accentColor: "#47A7FF"},
    schema: z.object({value: z.number(), decimals: z.number().int().min(0).max(2), suffix: z.string().max(8), color: color, accentColor: color}),
    fields: [
      {key: "value", label: "数值", section: "data", control: "number", step: 0.01},
      {key: "decimals", label: "小数位", section: "data", control: "number", min: 0, max: 2, step: 1},
      {key: "suffix", label: "后缀", section: "content", control: "text", maxLength: 8},
      {key: "color", label: "数字颜色", section: "style", control: "color"},
      {key: "accentColor", label: "强调色", section: "style", control: "color"},
    ],
  },
  {
    id: "template", name: "模板场景", category: "layout", description: "将现有模板作为可移动、缩放和定时的图层。", preview: "TPL",
    defaultSize: {width: 1, height: 1},
    defaultProps: {templateId: "stat-counter", templateProps: {}},
    schema: z.object({templateId: z.string().min(1), templateProps: z.record(z.string(), z.unknown())}),
    fields: [],
  },
];

export type MotionPresetDefinition = {
  id: ComposerMotionPresetId;
  name: string;
  description: string;
  phases: ReadonlyArray<"enter" | "exit" | "loop">;
};

export const motionPresets: ReadonlyArray<MotionPresetDefinition> = [
  {id: "none", name: "无", description: "保持静止。", phases: ["enter", "exit", "loop"]},
  {id: "fade", name: "淡入淡出", description: "只改变透明度。", phases: ["enter", "exit"]},
  {id: "rise", name: "向上浮现", description: "从下方进入画面。", phases: ["enter", "exit"]},
  {id: "drop", name: "向下落入", description: "从上方进入画面。", phases: ["enter", "exit"]},
  {id: "slide-left", name: "左侧滑入", description: "从左侧横向进入。", phases: ["enter", "exit"]},
  {id: "slide-right", name: "右侧滑入", description: "从右侧横向进入。", phases: ["enter", "exit"]},
  {id: "scale", name: "缩放显现", description: "从小尺寸平滑放大。", phases: ["enter", "exit"]},
  {id: "pop", name: "弹性跳出", description: "带轻微过冲的强调入场。", phases: ["enter", "exit"]},
  {id: "wipe-left", name: "左向擦除", description: "用裁切边缘揭示。", phases: ["enter", "exit"]},
  {id: "wipe-right", name: "右向擦除", description: "反向裁切揭示。", phases: ["enter", "exit"]},
  {id: "blur", name: "清晰聚焦", description: "从虚化过渡到清晰。", phases: ["enter", "exit"]},
  {id: "float", name: "轻微漂浮", description: "持续上下漂浮。", phases: ["loop"]},
  {id: "pulse", name: "节奏脉冲", description: "轻微缩放强调。", phases: ["loop"]},
  {id: "drift", name: "水平漂移", description: "持续左右缓动。", phases: ["loop"]},
  {id: "rotate", name: "缓慢旋转", description: "适合图形和环形元素。", phases: ["loop"]},
  {id: "breathe", name: "呼吸明暗", description: "以透明度轻微呼吸。", phases: ["loop"]},
];

const componentsWithContentAnimation = new Set<ComposerComponentId>([
  "stat-number",
  "progress",
  "bar-chart",
]);

export const composerComponentSupportsContentEasing = (id: ComposerComponentId): boolean =>
  componentsWithContentAnimation.has(id);

export const getComposerComponent = (id: ComposerComponentId): ComposerComponentDefinition => {
  const component = composerComponents.find((candidate) => candidate.id === id);
  if (!component) throw new Error(`未安装组件：${id}`);
  return component;
};

export const createComposerNode = (
  componentId: ComposerComponentId,
  id: string,
  durationInFrames: number,
  zIndex = 0,
): ComposerNode => {
  const definition = getComposerComponent(componentId);
  const width = definition.defaultSize.width;
  const height = definition.defaultSize.height;
  return {
    id,
    name: definition.name,
    componentId,
    transform: {
      x: (1 - width) / 2,
      y: (1 - height) / 2,
      width,
      height,
      rotation: 0,
      anchorX: 0.5,
      anchorY: 0.5,
      opacity: 1,
      zIndex,
    },
    timing: {from: 0, durationInFrames: Math.max(1, durationInFrames)},
    motion: {
      enter: "fade",
      enterDuration: 15,
      enterEasing: "smooth-out",
      contentEasing: "smooth-in-out",
      exit: "fade",
      exitDuration: 15,
      exitEasing: "smooth-in",
      loop: "none",
      intensity: 1,
      mix: {enter: 1, exit: 1, loop: 1},
    },
    props: structuredClone(definition.defaultProps),
    hidden: false,
    locked: false,
  };
};

export const validateComposerComposition = (
  composition: ComposerComposition,
  assets: ReadonlyArray<ProjectAsset>,
  durationInFrames: number,
): string | null => {
  if (composition.nodes.length === 0) return "Composer 画布至少需要一个图层";
  for (const node of composition.nodes) {
    const definition = getComposerComponent(node.componentId);
    const parsed = definition.schema.safeParse(node.props);
    if (!parsed.success) return `${node.name}：${parsed.error.issues[0]?.message ?? "组件参数无效"}`;
    if (node.timing.from >= durationInFrames) return `${node.name} 的开始时间超出项目时长`;
    if (node.timing.from + node.timing.durationInFrames > durationInFrames) return `${node.name} 的结束时间超出项目时长`;
    if (node.componentId === "image" || node.componentId === "video") {
      const assetId = node.props.assetId;
      if (typeof assetId === "string" && assetId && !assets.some((asset) => asset.id === assetId)) {
        return `${node.name} 对应的素材已丢失，请重新选择`;
      }
    }
  }
  return null;
};
