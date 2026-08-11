import type {MotionProject} from "../../../packages/project-model/src";
import type {AnyTemplateManifest} from "../../templates/catalog";
import {BATCH_NAME, BATCH_SKIP, buildBatchProjects, type BatchDraft} from "./batch";
import {X} from "lucide-react";
import {Select} from "./Select";

export const BatchImportPanel: React.FC<{
  draft: BatchDraft;
  project: MotionProject;
  manifest: AnyTemplateManifest;
  onChange: (draft: BatchDraft) => void;
  onClose: () => void;
  onStart: (projects: MotionProject[]) => Promise<void>;
}> = ({draft, project, manifest, onChange, onClose, onStart}) => {
  const result = buildBatchProjects(draft, project, manifest);
  const targets = manifest.fields.filter((field) => field.control !== "data-array" && field.control !== "media");
  return <div className="batch-import-panel">
    <div className="batch-heading"><div><strong>批量预览</strong><span>{draft.fileName} · {draft.records.length} 行</span></div><button type="button" className="icon-btn" onClick={onClose} title="关闭" aria-label="关闭"><X /></button></div>
    <div className="batch-mapping-list">{draft.headers.map((header) => <label key={header}><span>{header}</span><Select ariaLabel={`${header} 映射`} value={draft.mappings[header] ?? BATCH_SKIP} options={[{value: BATCH_SKIP, label: "忽略此列"}, {value: BATCH_NAME, label: "项目名称"}, ...targets.map((field) => ({value: field.key, label: field.label}))]} onChange={(value) => onChange({...draft, mappings: {...draft.mappings, [header]: value}})} /></label>)}</div>
    <label className="field"><span>输出命名规则</span><input value={draft.namingPattern} onChange={(event) => onChange({...draft, namingPattern: event.target.value})} /><small className="field-help">支持 {"{{project}}"}、{"{{index}}"}、{"{{name}}"} 和任意 CSV 列名。</small></label>
    <div className="batch-preview-table"><div className="batch-preview-row batch-preview-head"><span>序号</span><span>输出名称</span><span>状态</span></div>{draft.records.slice(0, 5).map((_record, index) => {
      const built = buildBatchProjects({...draft, records: [draft.records[index]!]}, project, manifest);
      return <div className="batch-preview-row" key={index}><span>{index + 1}</span><span>{built.projects[0]?.name ?? "—"}</span><span className={built.errors.length ? "batch-row-error" : "batch-row-ok"}>{built.errors[0] ?? "可生成"}</span></div>;
    })}</div>
    {draft.records.length > 5 && <p className="field-help">另有 {draft.records.length - 5} 行未展开</p>}
    {result.errors.length > 0 && <p className="batch-error-summary">{result.errors.length} 行有错误；修正映射或 CSV 后才能全部生成。当前可生成 {result.projects.length} 项。</p>}
    <button className="batch-start-button" type="button" disabled={result.projects.length === 0 || result.errors.length > 0} onClick={() => void onStart(result.projects)}>开始生成 {result.projects.length} 项</button>
  </div>;
};
