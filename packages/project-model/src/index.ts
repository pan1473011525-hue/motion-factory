import {z} from "zod";

export const PROJECT_FORMAT_VERSION = 2;

export const exportPresetIdSchema = z.enum([
  "prores-4444",
  "prores-4444-xq",
  "png-sequence",
  "h264-review",
  "lottie-json",
]);

export const frameRateSchema = z.object({
  numerator: z.number().int().positive().max(120_000),
  denominator: z.number().int().positive().max(10_000),
});

export const projectCanvasSchema = z.object({
  width: z.number().int().min(320).max(8192).refine((value) => value % 2 === 0, {
    message: "画布宽度必须为偶数",
  }),
  height: z.number().int().min(240).max(8192).refine((value) => value % 2 === 0, {
    message: "画布高度必须为偶数",
  }),
  fps: frameRateSchema,
  durationInFrames: z.number().int().positive().max(216_000),
  colorSpace: z.literal("rec709"),
  transparent: z.boolean(),
});

export const projectAssetSchema = z.object({
  id: z.string().min(1),
  path: z.string().min(1),
  kind: z.enum(["image", "video", "audio", "font"]),
  fingerprint: z.string().optional(),
  proxyPath: z.string().optional(),
  thumbnailPath: z.string().optional(),
  durationSeconds: z.number().positive().optional(),
});

export const projectAnimationSchema = z.object({
  speed: z.number().min(0.5).max(2),
  reducedMotion: z.boolean(),
  edgeFrames: z.number().int().min(6).max(90),
});

export const projectTypographySchema = z.object({
  fontAssetId: z.string(),
  fallbackFamily: z.enum(["system", "serif", "mono"]),
});

export const templateAppearanceSchema = z.object({
  // null means "use the template's original surface palette" for backwards compatibility.
  surfaceColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/u).nullable(),
  surfaceOpacity: z.number().min(0).max(1),
  surfaceTone: z.enum(["auto", "dark", "light"]),
});

export const DEFAULT_TEMPLATE_APPEARANCE = {
  surfaceColor: null,
  surfaceOpacity: 1,
  surfaceTone: "auto",
} as const;

export const projectExportOptionsSchema = z.object({
  conflictPolicy: z.enum(["version", "replace", "skip"]),
  segmented: z.boolean().default(false),
});

export const composerComponentIdSchema = z.enum([
  "title",
  "body-text",
  "stat-number",
  "rectangle",
  "ellipse",
  "divider",
  "image",
  "video",
  "quote",
  "badge",
  "progress",
  "callout",
  "lower-third",
  "bar-chart",
  "list-reveal",
  "card-stack",
  "skeleton-reveal",
  "svg-trace",
  "odometer-roll",
  "lottie",
  "vintage-filter",
  "template",
]);

export const composerMotionPresetIdSchema = z.enum([
  "none",
  "fade",
  "rise",
  "drop",
  "slide-left",
  "slide-right",
  "scale",
  "pop",
  "wipe-left",
  "wipe-right",
  "blur",
  "float",
  "pulse",
  "drift",
  "rotate",
  "breathe",
]);

export const composerEasingPresetIdSchema = z.enum([
  "linear",
  "smooth-in",
  "smooth-out",
  "smooth-in-out",
  "quad-in",
  "quad-out",
  "quad-in-out",
  "expo-out",
  "back-out",
  "spring-smooth",
  "spring-snappy",
]);

export const composerNodeTransformSchema = z.object({
  x: z.number().min(-2).max(3),
  y: z.number().min(-2).max(3),
  width: z.number().positive().max(3),
  height: z.number().positive().max(3),
  rotation: z.number().min(-3600).max(3600),
  anchorX: z.number().min(0).max(1),
  anchorY: z.number().min(0).max(1),
  opacity: z.number().min(0).max(1),
  zIndex: z.number().int().min(-10_000).max(10_000),
});

export const composerNodeTimingSchema = z.object({
  from: z.number().int().min(0).max(216_000),
  durationInFrames: z.number().int().positive().max(216_000),
});

export const composerNodeMotionSchema = z.preprocess((value) => {
  if (typeof value !== "object" || value === null || Array.isArray(value)) return value;
  const motion = value as Record<string, unknown>;
  return {
    ...motion,
    // Existing v2 projects used the expo-out Bezier for every tween and a spring for pop.
    // Fill those values during parsing so opening an older project does not change its motion.
    enterEasing: motion.enterEasing ?? (motion.enter === "pop" ? "spring-snappy" : "expo-out"),
    contentEasing: motion.contentEasing ?? "expo-out",
    exitEasing: motion.exitEasing ?? "expo-out",
  };
}, z.object({
  enter: composerMotionPresetIdSchema,
  enterDuration: z.number().int().min(1).max(3_600),
  enterEasing: composerEasingPresetIdSchema,
  contentEasing: composerEasingPresetIdSchema,
  exit: composerMotionPresetIdSchema,
  exitDuration: z.number().int().min(1).max(3_600),
  exitEasing: composerEasingPresetIdSchema,
  loop: composerMotionPresetIdSchema,
  intensity: z.number().min(0).max(2),
  // mix:入场/退场/持续三通道的强度权重(0..1),可叠加时按权重混合,默认全量。
  mix: z.object({
    enter: z.number().min(0).max(1),
    exit: z.number().min(0).max(1),
    loop: z.number().min(0).max(1),
  }).default({enter: 1, exit: 1, loop: 1}),
}));

export const composerNodeSchema = z.object({
  id: z.string().min(1).max(128),
  name: z.string().trim().min(1).max(96),
  componentId: composerComponentIdSchema,
  transform: composerNodeTransformSchema,
  timing: composerNodeTimingSchema,
  motion: composerNodeMotionSchema,
  props: z.record(z.string(), z.unknown()),
  hidden: z.boolean(),
  locked: z.boolean(),
});

export const composerCompositionSchema = z.object({
  backgroundColor: z.string().min(1).max(64),
  snapToGrid: z.boolean(),
  gridSize: z.number().min(0.005).max(0.25),
  nodes: z.array(composerNodeSchema).max(200),
});

// 具名时间槽(Time Events):时间轴上的可拖拽标记点,供模板动画对齐/分段导出等消费。
export const timeSlotSchema = z.object({
  id: z.string().uuid(),
  label: z.string().trim().min(1).max(24),
  frame: z.number().int().min(0),
});

// 分段点:把画布时长切分为多个导出段落,导出时生成 sections.json 元数据。
export const segmentSchema = z.object({
  id: z.string().uuid(),
  label: z.string().trim().min(1).max(24),
  frame: z.number().int().min(0),
});

export const createEmptyComposerComposition = (): ComposerComposition => ({
  backgroundColor: "transparent",
  snapToGrid: true,
  gridSize: 0.025,
  nodes: [],
});

export const motionProjectSchema = z.object({
  formatVersion: z.literal(PROJECT_FORMAT_VERSION),
  id: z.string().uuid(),
  name: z.string().trim().min(1).max(96),
  template: z.object({
    id: z.string().min(1),
    version: z.string().min(1),
  }),
  canvas: projectCanvasSchema,
  props: z.record(z.string(), z.unknown()),
  assets: z.array(projectAssetSchema),
  animation: projectAnimationSchema.default({speed: 1, reducedMotion: false, edgeFrames: 18}),
  typography: projectTypographySchema.default({fontAssetId: "", fallbackFamily: "system"}),
  templateAppearance: templateAppearanceSchema.default(DEFAULT_TEMPLATE_APPEARANCE),
  exportOptions: projectExportOptionsSchema.default({conflictPolicy: "version", segmented: false}),
  editorMode: z.enum(["template", "composer"]).default("template"),
  composition: composerCompositionSchema.default(createEmptyComposerComposition),
  timeSlots: z.array(timeSlotSchema).default([]),
  segments: z.array(segmentSchema).default([]),
  exportPresetId: exportPresetIdSchema,
  updatedAt: z.string().datetime({offset: true}),
});

const legacyMotionProjectSchema = z.object({
  formatVersion: z.literal(1),
  id: z.string().uuid(),
  name: z.string().trim().min(1).max(96),
  template: z.object({
    id: z.string().min(1),
    version: z.string().min(1),
  }),
  canvas: projectCanvasSchema,
  props: z.record(z.string(), z.unknown()),
  assets: z.array(projectAssetSchema),
  animation: projectAnimationSchema.default({speed: 1, reducedMotion: false, edgeFrames: 18}),
  typography: projectTypographySchema.default({fontAssetId: "", fallbackFamily: "system"}),
  templateAppearance: templateAppearanceSchema.default(DEFAULT_TEMPLATE_APPEARANCE),
  exportOptions: projectExportOptionsSchema.default({conflictPolicy: "version", segmented: false}),
  exportPresetId: exportPresetIdSchema,
  updatedAt: z.string().datetime({offset: true}),
});

export type FrameRate = z.infer<typeof frameRateSchema>;
export type ExportPresetId = z.infer<typeof exportPresetIdSchema>;
export type ProjectAsset = z.infer<typeof projectAssetSchema>;
export type ProjectAnimation = z.infer<typeof projectAnimationSchema>;
export type ProjectTypography = z.infer<typeof projectTypographySchema>;
export type TemplateAppearance = z.infer<typeof templateAppearanceSchema>;
export type ProjectExportOptions = z.infer<typeof projectExportOptionsSchema>;
export type TimeSlot = z.infer<typeof timeSlotSchema>;
export type Segment = z.infer<typeof segmentSchema>;
export type ComposerComponentId = z.infer<typeof composerComponentIdSchema>;
export type ComposerMotionPresetId = z.infer<typeof composerMotionPresetIdSchema>;
export type ComposerEasingPresetId = z.infer<typeof composerEasingPresetIdSchema>;
export type ComposerNodeTransform = z.infer<typeof composerNodeTransformSchema>;
export type ComposerNodeTiming = z.infer<typeof composerNodeTimingSchema>;
export type ComposerNodeMotion = z.infer<typeof composerNodeMotionSchema>;
export type ComposerNode = z.infer<typeof composerNodeSchema>;
export type ComposerComposition = z.infer<typeof composerCompositionSchema>;
export type MotionProject = z.infer<typeof motionProjectSchema>;

export const FRAME_RATE_PRESETS = [
  {label: "23.976", value: {numerator: 24_000, denominator: 1_001}},
  {label: "24", value: {numerator: 24, denominator: 1}},
  {label: "25", value: {numerator: 25, denominator: 1}},
  {label: "29.97", value: {numerator: 30_000, denominator: 1_001}},
  {label: "30", value: {numerator: 30, denominator: 1}},
  {label: "50", value: {numerator: 50, denominator: 1}},
  {label: "59.94", value: {numerator: 60_000, denominator: 1_001}},
  {label: "60", value: {numerator: 60, denominator: 1}},
] as const satisfies ReadonlyArray<{label: string; value: FrameRate}>;

export const CANVAS_PRESETS = [
  {id: "hd-landscape", label: "横屏 1080p", width: 1920, height: 1080},
  {id: "uhd-landscape", label: "横屏 4K", width: 3840, height: 2160},
  {id: "hd-portrait", label: "竖屏 1080p", width: 1080, height: 1920},
  {id: "square", label: "方形", width: 1080, height: 1080},
] as const;

export type CreateMotionProjectInput = {
  id: string;
  now: string;
  name?: string;
  templateId: string;
  templateVersion: string;
  props: Record<string, unknown>;
};

export const createMotionProject = (
  input: CreateMotionProjectInput,
): MotionProject =>
  motionProjectSchema.parse({
    formatVersion: PROJECT_FORMAT_VERSION,
    id: input.id,
    name: input.name ?? "未命名项目",
    template: {
      id: input.templateId,
      version: input.templateVersion,
    },
    canvas: {
      width: 1920,
      height: 1080,
      fps: {numerator: 30, denominator: 1},
      durationInFrames: 150,
      colorSpace: "rec709",
      transparent: true,
    },
    props: input.props,
    assets: [],
    animation: {speed: 1, reducedMotion: false, edgeFrames: 18},
    typography: {fontAssetId: "", fallbackFamily: "system"},
    templateAppearance: DEFAULT_TEMPLATE_APPEARANCE,
    exportOptions: {conflictPolicy: "version", segmented: false},
    editorMode: "template",
    composition: createEmptyComposerComposition(),
    exportPresetId: "prores-4444",
    updatedAt: input.now,
  });

export const parseMotionProject = (value: unknown): MotionProject => {
  if (typeof value === "object" && value !== null && "formatVersion" in value && value.formatVersion === 1) {
    const legacy = legacyMotionProjectSchema.parse(value);
    return motionProjectSchema.parse({
      ...legacy,
      formatVersion: PROJECT_FORMAT_VERSION,
      editorMode: "template",
      composition: createEmptyComposerComposition(),
    });
  }
  return motionProjectSchema.parse(value);
};

export const parseMotionProjectJson = (json: string): MotionProject =>
  parseMotionProject(JSON.parse(json) as unknown);

export const serializeMotionProject = (project: MotionProject): string =>
  `${JSON.stringify(parseMotionProject(project), null, 2)}\n`;

export const getFrameRate = (fps: FrameRate): number =>
  fps.numerator / fps.denominator;

export const secondsToFrames = (seconds: number, fps: FrameRate): number =>
  Math.max(1, Math.round(seconds * getFrameRate(fps)));

export const framesToSeconds = (frames: number, fps: FrameRate): number =>
  frames / getFrameRate(fps);

export const formatTimecode = (frames: number, fps: FrameRate): string => {
  const rate = getFrameRate(fps);
  const nominalFps = Math.ceil(rate);
  const safeFrames = Math.max(0, Math.floor(frames));
  const totalSeconds = Math.floor(safeFrames / rate);
  const hours = Math.floor(totalSeconds / 3_600);
  const minutes = Math.floor((totalSeconds % 3_600) / 60);
  const seconds = totalSeconds % 60;
  const frame = Math.min(nominalFps - 1, Math.floor(safeFrames - totalSeconds * rate));
  return [hours, minutes, seconds, frame]
    .map((value) => value.toString().padStart(2, "0"))
    .join(":");
};

export const getDurationSeconds = (project: MotionProject): number =>
  project.canvas.durationInFrames / getFrameRate(project.canvas.fps);
