import type {
  DataArrayInspectorField,
  InspectorField,
  InspectorSection,
} from "../../../packages/template-sdk/src";
import type {ProjectAsset} from "../../../packages/project-model/src";
import type {AnyTemplateManifest} from "../../templates/catalog";
import {useRef, useState} from "react";
import {ArrowDown, ArrowUp, X} from "lucide-react";
import {parseCsv} from "./csv";
import {InspectorGroup} from "./InspectorGroup";
import {RangeNumberControl} from "./PropertyControls";
import {Select} from "./Select";

const sectionLabels: Record<InspectorSection, string> = {
  content: "内容",
  data: "数据 / 素材",
  source: "来源",
  style: "样式",
  animation: "动画",
  layout: "布局",
};

const orderedSections: InspectorSection[] = [
  "content",
  "data",
  "source",
  "layout",
  "style",
  "animation",
];

type InspectorProps = {
  manifest: AnyTemplateManifest;
  props: Record<string, unknown>;
  assets: ProjectAsset[];
  onChange: (key: string, value: unknown) => void;
  onPickMedia: (field: Extract<InspectorField, {control: "media"}>) => Promise<void>;
};

const asRows = (value: unknown): Array<Record<string, unknown>> =>
  Array.isArray(value)
    ? value.filter((row): row is Record<string, unknown> => typeof row === "object" && row !== null)
    : [];

const coerceCellValue = (value: string, kind: "text" | "number" | "color"): unknown =>
  kind === "number" ? Number(value) || 0 : value;

const DataArrayEditor: React.FC<{
  field: DataArrayInspectorField;
  value: unknown;
  onChange: (value: Array<Record<string, unknown>>) => void;
}> = ({field, value, onChange}) => {
  const rows = asRows(value);
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const csvInputRef = useRef<HTMLInputElement>(null);

  const updateCell = (index: number, key: string, nextValue: unknown): void => {
    onChange(rows.map((row, rowIndex) => rowIndex === index ? {...row, [key]: nextValue} : row));
  };

  const move = (index: number, direction: -1 | 1): void => {
    const target = index + direction;
    if (target < 0 || target >= rows.length) return;
    const next = [...rows];
    [next[index], next[target]] = [next[target], next[index]];
    onChange(next);
  };

  const pasteTable = (event: React.ClipboardEvent<HTMLDivElement>): void => {
    const text = event.clipboardData.getData("text/plain");
    if (!text.includes("\t") && !text.includes("\n")) return;
    const parsed = text.trim().split(/\r?\n/).map((line) => {
      const cells = line.split("\t");
      return Object.fromEntries(field.columns.map((column, index) => [
        column.key,
        coerceCellValue(cells[index] ?? "", column.kind),
      ]));
    }).slice(0, field.maxItems);
    if (parsed.length > 0) {
      event.preventDefault();
      onChange(parsed);
    }
  };

  const importCsv = async (file: File): Promise<void> => {
    const records = parseCsv(await file.text()).slice(0, field.maxItems);
    const next = records.map((record) => Object.fromEntries(field.columns.map((column) => {
      const raw = record[column.key] ?? record[column.label] ?? "";
      return [column.key, coerceCellValue(raw, column.kind)];
    })));
    if (next.length > 0) onChange(next);
  };

  return (
    <div className="data-editor" onPaste={pasteTable}>
      <div className="data-grid data-grid-header" style={{gridTemplateColumns: `24px ${field.columns.map((column) => `${column.width ?? 1}fr`).join(" ")} 62px`}}>
        <span>#</span>
        {field.columns.map((column) => <span key={column.key}>{column.label}</span>)}
        <span />
      </div>
      {rows.map((row, index) => (
        <div className={`data-grid ${dragIndex === index ? "data-row-dragging" : ""}`} draggable key={index} onDragStart={() => setDragIndex(index)} onDragEnd={() => setDragIndex(null)} onDragOver={(event) => event.preventDefault()} onDrop={() => {
          if (dragIndex === null || dragIndex === index) return;
          const next = [...rows];
          const [moved] = next.splice(dragIndex, 1);
          if (moved) next.splice(index, 0, moved);
          onChange(next);
          setDragIndex(null);
        }} style={{gridTemplateColumns: `24px ${field.columns.map((column) => `${column.width ?? 1}fr`).join(" ")} 62px`}}>
          <span className="row-index" title="拖动排序">{index + 1}</span>
          {field.columns.map((column) => (
            <input
              key={column.key}
              type={column.kind === "number" ? "number" : column.kind === "color" ? "color" : "text"}
              value={String(row[column.key] ?? "")}
              onChange={(event) => updateCell(index, column.key, coerceCellValue(event.target.value, column.kind))}
              aria-label={`${field.label} ${index + 1} ${column.label}`}
            />
          ))}
          <span className="row-actions">
            <button type="button" className="icon-btn" aria-label="上移" disabled={index === 0} onClick={() => move(index, -1)}><ArrowUp /></button>
            <button type="button" className="icon-btn" aria-label="下移" disabled={index === rows.length - 1} onClick={() => move(index, 1)}><ArrowDown /></button>
            <button type="button" className="icon-btn" aria-label="删除" disabled={rows.length <= (field.minItems ?? 0)} onClick={() => onChange(rows.filter((_row, rowIndex) => rowIndex !== index))}><X /></button>
          </span>
        </div>
      ))}
      <button
        className="add-row-button"
        type="button"
        disabled={rows.length >= field.maxItems}
        onClick={() => onChange([...rows, {...field.newItem}])}
      >
        + 添加数据项
      </button>
      <button className="add-row-button secondary-row-button" type="button" onClick={() => csvInputRef.current?.click()}>导入 CSV…</button>
      <input ref={csvInputRef} className="sr-only" type="file" accept=".csv,text/csv" onChange={(event) => {const file = event.target.files?.[0]; if (file) void importCsv(file).finally(() => {event.target.value = "";});}} />
      <p className="field-help">可粘贴 Numbers / Excel、拖动排序或导入 CSV，最多 {field.maxItems} 项</p>
    </div>
  );
};

export const FieldControl: React.FC<{
  field: InspectorField;
  value: unknown;
  assets: ProjectAsset[];
  onChange: (value: unknown) => void;
  onPickMedia: () => Promise<void>;
}> = ({field, value, assets, onChange, onPickMedia}) => {
  if (field.control === "data-array") {
    return <DataArrayEditor field={field} value={value} onChange={onChange} />;
  }
  if (field.control === "media") {
    const asset = assets.find((candidate) => candidate.id === value);
    return (
      <div className="media-picker">
        {/* eslint-disable-next-line @remotion/warn-native-media-tag -- editor-only cached thumbnail, excluded from compositions */}
        {asset?.thumbnailPath && <img className="media-thumbnail" src={`file://${encodeURI(asset.thumbnailPath)}`} alt="" />}
        <button type="button" onClick={() => void onPickMedia()}>{asset ? "替换素材" : "选择素材…"}</button>
        <span title={asset?.path}>{asset?.path.split(/[\\/]/).at(-1) ?? "尚未选择"}{asset?.proxyPath ? " · 已缓存代理" : ""}{asset?.durationSeconds ? ` · ${asset.durationSeconds.toFixed(1)} 秒` : ""}</span>
        {asset && <button className="media-clear" type="button" onClick={() => onChange("")}>清除</button>}
      </div>
    );
  }
  if (field.control === "color") {
    const color = typeof value === "string" ? value : "#47A7FF";
    return (
      <div className="color-control">
        <input type="color" value={color} onChange={(event) => onChange(event.target.value)} />
        <input value={color.toUpperCase()} maxLength={9} onChange={(event) => onChange(event.target.value)} />
      </div>
    );
  }
  if (field.control === "select") {
    return <Select ariaLabel={field.label} value={String(value ?? "")} options={field.options.map((option) => ({value: String(option.value), label: option.label}))} onChange={(nextValue) => {
      const option = field.options.find((candidate) => String(candidate.value) === nextValue);
      onChange(option?.value ?? nextValue);
    }} />;
  }
  if (field.control === "boolean") {
    return <input className="switch-control" type="checkbox" checked={value === true} onChange={(event) => onChange(event.target.checked)} />;
  }
  if (field.control === "number") {
    return <RangeNumberControl ariaLabel={field.label} value={typeof value === "number" ? value : 0} min={field.min ?? -1_000_000} max={field.max ?? 1_000_000} step={field.step ?? 1} showSlider={field.min !== undefined && field.max !== undefined} onChange={onChange} />;
  }
  if (field.control === "textarea") {
    return <textarea value={String(value ?? "")} maxLength={field.maxLength} rows={field.rows ?? 4} placeholder={field.placeholder} onChange={(event) => onChange(event.target.value)} />;
  }
  return <input value={String(value ?? "")} maxLength={field.maxLength} placeholder={field.placeholder} onChange={(event) => onChange(event.target.value)} />;
};

export const Inspector: React.FC<InspectorProps> = ({
  manifest,
  props,
  assets,
  onChange,
  onPickMedia,
}) => (
  <>
    {orderedSections.map((section) => {
      const fields = manifest.fields.filter((field) => field.section === section);
      if (fields.length === 0) return null;
      return (
        <InspectorGroup title={sectionLabels[section]} defaultOpen={section === "content"} key={section}>
          {fields.map((field) => (
            <label className={`field field-${field.control}`} key={field.key}>
              <span>{field.label}</span>
              <FieldControl
                field={field}
                value={props[field.key]}
                assets={assets}
                onChange={(value) => onChange(field.key, value)}
                onPickMedia={() => onPickMedia(field as Extract<InspectorField, {control: "media"}>)}
              />
              {field.help && <small className="field-help">{field.help}</small>}
            </label>
          ))}
        </InspectorGroup>
      );
    })}
  </>
);
