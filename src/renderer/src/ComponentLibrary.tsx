import {useMemo, useState} from "react";
import type {ComposerComponentId} from "../../../packages/project-model/src";
import {composerComponents, motionPresets, type ComposerComponentCategory} from "../../composer/registry";
import {GripVertical, Plus, WandSparkles} from "lucide-react";

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

const phaseLabel = {enter: "入场", loop: "持续", exit: "退场"} as const;

export const ComponentLibrary: React.FC<{
  onAdd: (componentId: ComposerComponentId) => void;
}> = ({onAdd}) => {
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
  const filteredMotions = useMemo(() => motionPresets.filter((preset) => preset.id !== "none" && (!normalizedQuery || `${preset.name} ${preset.description}`.toLocaleLowerCase("zh-CN").includes(normalizedQuery))), [normalizedQuery]);

  return <aside className="template-panel component-library" aria-label="组件与动效库">
    <div className="library-mode-tabs" role="tablist" aria-label="资源库类型">
      <button type="button" role="tab" aria-selected={tab === "components"} className={tab === "components" ? "active" : ""} onClick={() => setTab("components")}>组件</button>
      <button type="button" role="tab" aria-selected={tab === "motions"} className={tab === "motions" ? "active" : ""} onClick={() => setTab("motions")}>动效</button>
    </div>
    <label className="search-field"><span className="sr-only">搜索组件或动效</span><input type="search" placeholder={tab === "components" ? "搜索组件" : "搜索动效"} value={query} onChange={(event) => setQuery(event.target.value)} /></label>
    {tab === "components" ? <>
      <nav className="category-row composer-categories" aria-label="组件分类">{(Object.keys(categoryLabels) as CategoryFilter[]).map((key) => <button className={category === key ? "category-active" : ""} type="button" key={key} onClick={() => setCategory(key)}>{categoryLabels[key]}</button>)}</nav>
      <p className="library-guidance"><GripVertical aria-hidden="true" />点击创建，或拖到画布定位</p>
      <div className="component-grid">{filteredComponents.map((component) => <button type="button" className={`component-card ${draggedComponentId === component.id ? "component-card-dragging" : ""}`} key={component.id} draggable title={`${component.name}：点击在画布中央创建，或拖到画布指定位置`} onClick={() => onAdd(component.id)} onDragStart={(event) => {setDraggedComponentId(component.id); event.dataTransfer.effectAllowed = "copy"; event.dataTransfer.setData("application/x-motioner-component", component.id); event.dataTransfer.setData("text/plain", component.id);}} onDragEnd={() => setDraggedComponentId(null)}><span className="component-glyph" aria-hidden="true">{component.preview}</span><span><strong>{component.name}</strong><small>{component.description}</small></span><b className="component-add-affordance" aria-hidden="true"><Plus size={13} /></b></button>)}{filteredComponents.length === 0 && <p className="empty-templates">没有匹配的组件</p>}</div>
      <div className="prototype-note"><strong>{composerComponents.length} 个基础组件</strong><span>拖入画布可按落点创建；点击则在画布中央创建。</span></div>
    </> : <>
      <p className="library-guidance"><GripVertical aria-hidden="true" />拖到画布组件或时间线图层应用</p>
      <div className="motion-library-list">{filteredMotions.map((preset) => <article className="motion-card motion-card-drag-only" key={preset.id} draggable title={`${preset.name}：拖到组件或图层的入场、持续、退场区域`} onDragStart={(event) => {event.dataTransfer.effectAllowed = "copy"; event.dataTransfer.setData("application/x-motioner-motion-preset", preset.id); event.dataTransfer.setData("text/plain", preset.id);}}><span className={`motion-preview motion-${preset.id}`} aria-hidden="true"><WandSparkles /></span><span className="motion-card-copy"><strong>{preset.name}</strong><small>{preset.description}</small><span className="motion-phase-tags">{preset.phases.map((phase) => <b key={phase}>{phaseLabel[phase]}</b>)}</span></span><GripVertical className="motion-drag-icon" aria-hidden="true" /></article>)}{filteredMotions.length === 0 && <p className="empty-templates">没有匹配的动效</p>}</div>
      <div className="prototype-note"><strong>拖放应用</strong><span>清除和精确参数调整请在右侧“动效设置”完成。</span></div>
    </>}
  </aside>;
};
