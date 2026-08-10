import type {MotionProject} from "../../../packages/project-model/src";
import type {InspectorField} from "../../../packages/template-sdk/src";
import type {AnyTemplateManifest} from "../../templates/catalog";

export const BATCH_SKIP = "__skip__";
export const BATCH_NAME = "__name__";
export type BatchTarget = typeof BATCH_SKIP | typeof BATCH_NAME | string;

export type BatchDraft = {
  fileName: string;
  records: Array<Record<string, string>>;
  headers: string[];
  mappings: Record<string, BatchTarget>;
  namingPattern: string;
};

const nameHeaders = new Set(["name", "filename", "projectname", "名称", "文件名", "项目名"]);

export const inferBatchMappings = (
  headers: string[],
  manifest: AnyTemplateManifest,
): Record<string, BatchTarget> => Object.fromEntries(headers.map((header) => {
  const normalized = header.trim().toLocaleLowerCase("zh-CN");
  if (nameHeaders.has(normalized)) return [header, BATCH_NAME];
  const field = manifest.fields.find((candidate) =>
    candidate.key.toLocaleLowerCase("zh-CN") === normalized
    || candidate.label.toLocaleLowerCase("zh-CN") === normalized);
  if (!field || field.control === "data-array" || field.control === "media") return [header, BATCH_SKIP];
  return [header, field.key];
}));

export const coerceBatchValue = (field: InspectorField, raw: string): unknown => {
  if (field.control === "number") {
    const value = Number(raw.replace(/,/gu, ""));
    if (!Number.isFinite(value)) throw new Error(`${field.label} 不是有效数字：${raw}`);
    return value;
  }
  if (field.control === "boolean") return ["1", "true", "yes", "是"].includes(raw.toLowerCase());
  if (field.control === "select") {
    return field.options.find((option) => String(option.value) === raw || option.label === raw)?.value ?? raw;
  }
  return raw;
};

export const formatBatchName = (
  pattern: string,
  record: Record<string, string>,
  index: number,
  projectName: string,
): string => {
  const explicitName = Object.entries(record).find(([header]) => nameHeaders.has(header.toLocaleLowerCase("zh-CN")))?.[1];
  const rendered = pattern.replace(/\{\{([^{}]+)\}\}/gu, (_match, rawToken: string) => {
    const token = rawToken.trim();
    if (token === "index") return String(index + 1).padStart(3, "0");
    if (token === "project") return projectName;
    if (token === "name") return explicitName ?? "";
    return record[token] ?? "";
  }).trim();
  return rendered || `${projectName}-${String(index + 1).padStart(3, "0")}`;
};

export type BatchBuildResult = {projects: MotionProject[]; errors: string[]};

export const buildBatchProjects = (
  draft: BatchDraft,
  project: MotionProject,
  manifest: AnyTemplateManifest,
): BatchBuildResult => {
  const projects: MotionProject[] = [];
  const errors: string[] = [];
  draft.records.forEach((record, rowIndex) => {
    try {
      const props = structuredClone(project.props);
      let explicitName = "";
      for (const header of draft.headers) {
        const raw = record[header] ?? "";
        const target = draft.mappings[header] ?? BATCH_SKIP;
        if (target === BATCH_SKIP || raw === "") continue;
        if (target === BATCH_NAME) {
          explicitName = raw;
          continue;
        }
        const field = manifest.fields.find((candidate) => candidate.key === target);
        if (!field || field.control === "data-array" || field.control === "media") continue;
        props[field.key] = coerceBatchValue(field, raw);
      }
      const parsed = manifest.schema.safeParse(props);
      if (!parsed.success) throw new Error(parsed.error.issues[0]?.message ?? "参数无效");
      const recordWithName = explicitName ? {...record, name: explicitName} : record;
      projects.push({
        ...structuredClone(project),
        id: globalThis.crypto.randomUUID(),
        name: formatBatchName(draft.namingPattern, recordWithName, rowIndex, project.name),
        props: parsed.data,
        updatedAt: new Date().toISOString(),
      });
    } catch (error) {
      errors.push(`第 ${rowIndex + 2} 行：${error instanceof Error ? error.message : String(error)}`);
    }
  });
  return {projects, errors};
};
