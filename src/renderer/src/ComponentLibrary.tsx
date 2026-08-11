import {useMemo, useState} from "react";
import type {
  ComposerComponentId,
  ComposerMotionPresetId,
  ComposerNode,
} from "../../../packages/project-model/src";
import {
  composerComponents,
  motionPresets,
  type ComposerComponentCategory,
} from "../../composer/registry";
import {Check, GripVertical, Plus} from "lucide-react";

type LibraryTab = "components" | "motions";
type CategoryFilter = "all" | ComposerComponentCategory;

const categoryLabels: Record<CategoryFilter, string> = {
  all: "全部",
  text: "文字",
  shape: "图形",
  data: "数据",
  media: "素材",
  layout: "版式",
};

const isMotionApplied = (
  node: ComposerNode | null,
  presetId: ComposerMotionPresetId,
  phase: "enter" | "exit" | "loop",
): boolean => node?.motion[phase] === presetId;

export const ComponentLibrary: React.FC<{
  selectedNode: ComposerNode | null;
  onAdd: (componentId: ComposerComponentId) => void;
  onApplyMotion: (presetId: ComposerMotionPresetId, phase: "enter" | "exit" | "loop") => void;
}> = ({selectedNode, onAdd, onApplyMotion}) => {
  const [tab, setTab] = useState<LibraryTab>("components");
  const [category, setCategory] = useState<CategoryFilter>("all");
  const [query, setQuery] = useState("");
  const [draggedComponentId, setDraggedComponentId] = useState<ComposerComponentId | null>(null);
  const normalizedQuery = query.trim().toLocaleLowerCase("zh-CN");
  const filteredComponents = useMemo(() => composerComponents.filter((component) => {
    const matchesCategory = category === "all" || component.category === category;
    const haystack = `${component.name} ${component.description}`.toLocaleLowerCase("zh-CN");
    return matchesCategory && (!normalizedQuery || haystack.includes(normalizedQuery));
  }), [category, normalizedQuery]);
  const filteredMotions = useMemo(() => motionPresets.filter((preset) => {
    const haystack = `${preset.name} ${preset.description}`.toLocaleLowerCase("zh-CN");
    return !normalizedQuery || haystack.includes(normalizedQuery);
  }), [normalizedQuery]);

  return <aside className="template-panel component-library" aria-label="组件与动效库">
    <div className="library-mode-tabs" role="tablist" aria-label="资源库类型">
      <button type="button" role="tab" aria-selected={tab === "components"} className={tab === "components" ? "active" : ""} onClick={() => setTab("components")}>组件</button>
      <button type="button" role="tab" aria-selected={tab === "motions"} className={tab === "motions" ? "active" : ""} onClick={() => setTab("motions")}>动效</button>
    </div>
    <label className="search-field"><span className="sr-only">搜索组件或动效</span><input type="search" placeholder={tab === "components" ? "搜索组件" : "搜索动效"} value={query} onChange={(event) => setQuery(event.target.value)} /></label>
    {tab === "components" ? <>
      <nav className="category-row composer-categories" aria-label="组件分类">{(Object.keys(categoryLabels) as CategoryFilter[]).map((key) => <button className={category === key ? "category-active" : ""} type="button" key={key} onClick={() => setCategory(key)}>{categoryLabels[key]}</button>)}</nav>
      <p className="library-guidance"><GripVertical aria-hidden="true" />点击创建，或拖到画布定位</p>
      <div className="component-grid">{filteredComponents.map((component) => <button
        type="button"
        className={`component-card ${draggedComponentId === component.id ? "component-card-dragging" : ""}`}
        key={component.id}
        draggable
        title={`${component.name}：点击在画布中央创建，或拖到画布指定位置`}
        onClick={() => onAdd(component.id)}
        onDragStart={(event) => {
          setDraggedComponentId(component.id);
          event.dataTransfer.effectAllowed = "copy";
          event.dataTransfer.setData("application/x-motioner-component", component.id);
          event.dataTransfer.setData("text/plain", component.id);
        }}
        onDragEnd={() => setDraggedComponentId(null)}
      ><span className="component-glyph" aria-hidden="true">{component.preview}</span><span><strong>{component.name}</strong><small>{component.description}</small></span><b className="component-add-affordance" aria-hidden="true"><Plus size={13} /></b></button>)}{filteredComponents.length === 0 && <p className="empty-templates">没有匹配的组件</p>}</div>
      <div className="prototype-note"><strong>{composerComponents.length} 个基础组件</strong><span>拖入画布可按落点创建；点击则在画布中央创建。</span></div>
    </> : <>
      <div className="motion-library-list">{filteredMotions.map((preset) => {
        const appliedPhases = preset.phases.filter((phase) => isMotionApplied(selectedNode, preset.id, phase));
        const defaultPhase = preset.phases.includes("enter") ? "enter" : preset.phases.includes("loop") ? "loop" : preset.phases[0];
        const apply = (phase: "enter" | "exit" | "loop"): void => {
          const alreadyApplied = isMotionApplied(selectedNode, preset.id, phase);
          onApplyMotion(alreadyApplied && preset.id !== "none" ? "none" : preset.id, phase);
        };
        return <article
          className={`motion-card ${appliedPhases.length > 0 ? "motion-card-applied" : ""}`}
          key={preset.id}
          draggable={preset.id !== "none"}
          title={preset.id === "none" ? "点击清除对应阶段动效" : "拖到时间轴图层上，或点击阶段按钮应用"}
          onDragStart={(event) => {
            event.dataTransfer.effectAllowed = "copy";
            event.dataTransfer.setData("application/x-motioner-motion-preset", preset.id);
            event.dataTransfer.setData("text/plain", preset.id);
          }}
        >
          <button className="motion-card-main" type="button" disabled={!selectedNode || !defaultPhase} onClick={() => defaultPhase && apply(defaultPhase)} aria-label={`${preset.name}，${defaultPhase ? `应用为${defaultPhase === "enter" ? "入场" : defaultPhase === "exit" ? "退场" : "循环"}` : "不可应用"}`}>
            <span className={`motion-swatch motion-${preset.id} ${appliedPhases.length > 0 ? "applied" : ""}`} aria-hidden="true">{appliedPhases.length > 0 ? "✓" : ""}</span>
            <span><strong>{preset.name}</strong><small>{preset.description}</small></span>
            {preset.id !== "none" && <b className="motion-drag-hint" aria-hidden="true">拖</b>}
          </button>
          <div className="motion-apply-actions">
            {preset.phases.includes("enter") && <button type="button" className={isMotionApplied(selectedNode, preset.id, "enter") ? "applied" : ""} aria-pressed={isMotionApplied(selectedNode, preset.id, "enter")} onClick={() => apply("enter")} disabled={!selectedNode}>{isMotionApplied(selectedNode, preset.id, "enter") ? <><Check size={9} />入场</> : "入场"}</button>}
            {preset.phases.includes("exit") && <button type="button" className={isMotionApplied(selectedNode, preset.id, "exit") ? "applied" : ""} aria-pressed={isMotionApplied(selectedNode, preset.id, "exit")} onClick={() => apply("exit")} disabled={!selectedNode}>{isMotionApplied(selectedNode, preset.id, "exit") ? <><Check size={9} />退场</> : "退场"}</button>}
            {preset.phases.includes("loop") && <button type="button" className={isMotionApplied(selectedNode, preset.id, "loop") ? "applied" : ""} aria-pressed={isMotionApplied(selectedNode, preset.id, "loop")} onClick={() => apply("loop")} disabled={!selectedNode}>{isMotionApplied(selectedNode, preset.id, "loop") ? <><Check size={9} />循环</> : "循环"}</button>}
          </div>
        </article>;
      })}{filteredMotions.length === 0 && <p className="empty-templates">没有匹配的动效</p>}</div>
      <div className="prototype-note"><strong>{selectedNode ? `当前：${selectedNode.name}` : "可直接拖到时间轴"}</strong><span>点击阶段按钮可勾选；拖到素材条左、中、右区域可应用为入场、循环或退场。</span></div>
    </>}
  </aside>;
};
