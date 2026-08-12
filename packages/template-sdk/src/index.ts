import type {ZodType} from "zod";

export type DurationMode = "stretch" | "fixed-edges" | "loop" | "paginate";
export type TemplateCategory = "data" | "chart" | "information" | "subtitle" | "transition" | "media";
export type InspectorSection = "content" | "data" | "source" | "style" | "animation" | "layout";

type InspectorFieldBase<Key extends string> = {
  key: Key;
  label: string;
  section: InspectorSection;
  help?: string;
  advanced?: boolean;
};

export type TextInspectorField<Key extends string = string> = InspectorFieldBase<Key> & {
  control: "text" | "textarea";
  placeholder?: string;
  maxLength?: number;
  rows?: number;
};

export type NumberInspectorField<Key extends string = string> = InspectorFieldBase<Key> & {
  control: "number";
  min?: number;
  max?: number;
  step?: number;
  unit?: string;
};

export type ColorInspectorField<Key extends string = string> = InspectorFieldBase<Key> & {
  control: "color";
};

export type SelectInspectorField<Key extends string = string> = InspectorFieldBase<Key> & {
  control: "select";
  options: ReadonlyArray<{label: string; value: string | number}>;
};

export type BooleanInspectorField<Key extends string = string> = InspectorFieldBase<Key> & {
  control: "boolean";
};

export type DataArrayColumn = {
  key: string;
  label: string;
  kind: "text" | "number" | "color";
  width?: number;
};

export type DataArrayInspectorField<Key extends string = string> = InspectorFieldBase<Key> & {
  control: "data-array";
  columns: ReadonlyArray<DataArrayColumn>;
  minItems?: number;
  maxItems: number;
  newItem: Record<string, unknown>;
};

export type MediaInspectorField<Key extends string = string> = InspectorFieldBase<Key> & {
  control: "media";
  accept: ReadonlyArray<"image" | "video">;
  required?: boolean;
};

export type InspectorField<Key extends string = string> =
  | TextInspectorField<Key>
  | NumberInspectorField<Key>
  | ColorInspectorField<Key>
  | SelectInspectorField<Key>
  | BooleanInspectorField<Key>
  | DataArrayInspectorField<Key>
  | MediaInspectorField<Key>;

export type TemplateMigration<Props> = {
  from: string;
  to: string;
  migrate: (props: unknown) => Props;
};

export type TemplateManifest<Props extends Record<string, unknown>> = {
  id: string;
  compositionId: string;
  version: string;
  name: string;
  category: TemplateCategory;
  tags: ReadonlyArray<string>;
  description: string;
  schema: ZodType<Props>;
  defaultProps: Props;
  fields: ReadonlyArray<InspectorField<Extract<keyof Props, string>>>;
  durationMode: DurationMode;
  capabilities: {
    alpha: boolean;
    audio: boolean;
    mediaSlots: number;
    minDurationFrames: number;
    maxDurationFrames?: number;
    maxItems?: number;
    supportedAspectRatios: ReadonlyArray<"16:9" | "9:16" | "1:1" | "custom">;
  };
  stylePresets: ReadonlyArray<{
    id: string;
    name: string;
    patch: Partial<Props>;
  }>;
  migrations: ReadonlyArray<TemplateMigration<Props>>;
  preview: {
    accent: string;
    label: string;
  };
};

export type TemplateDefinition<
  Props extends Record<string, unknown>,
  Component,
> = TemplateManifest<Props> & {component: Component};

const validateManifest = <Props extends Record<string, unknown>>(
  manifest: TemplateManifest<Props>,
): void => {
  manifest.schema.parse(manifest.defaultProps);
  const keys = new Set(Object.keys(manifest.defaultProps));
  for (const field of manifest.fields) {
    if (!keys.has(field.key)) {
      throw new Error(`模板 ${manifest.id} 的检查器字段 ${field.key} 不在 defaultProps 中`);
    }
  }
  const uniqueFieldKeys = new Set(manifest.fields.map((field) => field.key));
  if (uniqueFieldKeys.size !== manifest.fields.length) {
    throw new Error(`模板 ${manifest.id} 存在重复的检查器字段`);
  }
  if (manifest.capabilities.minDurationFrames < 1) {
    throw new Error(`模板 ${manifest.id} 的最小时长必须大于 0 帧`);
  }
};

export const defineTemplateManifest = <Props extends Record<string, unknown>>(
  manifest: TemplateManifest<Props>,
): TemplateManifest<Props> => {
  validateManifest(manifest);
  return manifest;
};

export const defineTemplate = <
  Props extends Record<string, unknown>,
  Component,
>(
  definition: TemplateDefinition<Props, Component>,
): TemplateDefinition<Props, Component> => {
  validateManifest(definition);
  return definition;
};

export const migrateTemplateProps = <Props extends Record<string, unknown>>(
  manifest: TemplateManifest<Props>,
  fromVersion: string,
  rawProps: unknown,
): Props => {
  let version = fromVersion;
  let props = rawProps;
  const visited = new Set<string>();

  while (version !== manifest.version) {
    if (visited.has(version)) {
      throw new Error(`模板 ${manifest.id} 的迁移链存在循环：${version}`);
    }
    visited.add(version);
    const migration = manifest.migrations.find((candidate) => candidate.from === version);
    if (!migration) {
      throw new Error(`模板 ${manifest.id} 无法从 ${version} 迁移到 ${manifest.version}`);
    }
    props = migration.migrate(props);
    version = migration.to;
  }

  return manifest.schema.parse(props);
};

export const getMinDurationFrames = <Props extends Record<string, unknown>>(
  manifest: TemplateManifest<Props>,
  fps: number,
): number => Math.ceil((manifest.capabilities.minDurationFrames / 30) * fps);

export const validateTemplateDuration = <Props extends Record<string, unknown>>(
  manifest: TemplateManifest<Props>,
  durationInFrames: number,
  fps: number,
): string | null => {
  const minimum = getMinDurationFrames(manifest, fps);
  if (durationInFrames < minimum) {
    return `${manifest.name} 至少需要 ${minimum} 帧（${(minimum / fps).toFixed(2)} 秒）`;
  }
  const maximum = manifest.capabilities.maxDurationFrames;
  if (maximum && durationInFrames > Math.ceil((maximum / 30) * fps)) {
    return `${manifest.name} 的时长超过模板上限`;
  }
  return null;
};

export const validateTemplateAssets = <Props extends Record<string, unknown>>(
  manifest: TemplateManifest<Props>,
  props: Record<string, unknown>,
  assets: ReadonlyArray<{id: string; path: string}>,
): string | null => {
  for (const field of manifest.fields) {
    if (field.control !== "media") continue;
    const assetId = props[field.key];
    if ((!assetId || typeof assetId !== "string") && field.required) {
      return `${manifest.name} 需要选择“${field.label}”`;
    }
    if (typeof assetId === "string" && assetId && !assets.some((asset) => asset.id === assetId)) {
      return `${field.label}对应的素材已丢失，请重新选择`;
    }
  }
  return null;
};

export const getNormalizedProgress = (
  frame: number,
  durationInFrames: number,
): number => Math.min(1, Math.max(0, frame / Math.max(1, durationInFrames - 1)));

export type FixedEdgesPhase = "intro" | "hold" | "outro";

export const getFixedEdgesTimeline = (
  frame: number,
  durationInFrames: number,
  edgeFrames: number,
): {phase: FixedEdgesPhase; phaseProgress: number} => {
  const safeDuration = Math.max(1, durationInFrames);
  const safeEdge = Math.max(1, Math.min(edgeFrames, Math.floor(safeDuration / 2)));
  const outroStart = safeDuration - safeEdge;
  if (frame < safeEdge) {
    return {phase: "intro", phaseProgress: Math.min(1, Math.max(0, frame / safeEdge))};
  }
  if (frame >= outroStart) {
    return {
      phase: "outro",
      phaseProgress: Math.min(1, Math.max(0, (frame - outroStart) / Math.max(1, safeDuration - outroStart - 1))),
    };
  }
  return {
    phase: "hold",
    phaseProgress: (frame - safeEdge) / Math.max(1, outroStart - safeEdge),
  };
};

export const getLoopFrame = (
  frame: number,
  loopStart: number,
  loopLength: number,
): number => frame < loopStart ? frame : loopStart + ((frame - loopStart) % Math.max(1, loopLength));

export const getPagination = (
  frame: number,
  durationInFrames: number,
  itemCount: number,
  itemsPerPage: number,
): {page: number; pageCount: number; pageProgress: number} => {
  const pageCount = Math.max(1, Math.ceil(itemCount / Math.max(1, itemsPerPage)));
  const progress = getNormalizedProgress(frame, durationInFrames);
  const page = Math.min(pageCount - 1, Math.floor(progress * pageCount));
  const pageProgress = Math.min(1, progress * pageCount - page);
  return {page, pageCount, pageProgress};
};
