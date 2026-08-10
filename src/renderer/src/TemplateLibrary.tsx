import {Player} from "@remotion/player";
import {useMemo, useState} from "react";
import {Star} from "lucide-react";
import {templateCatalog, type AnyTemplateManifest} from "../../templates/catalog";
import {MotionerComposition} from "../../templates/runtime";

type CategoryFilter = "all" | "data" | "chart" | "information" | "subtitle" | "media" | "favorite" | "recent";

const categoryLabels: Record<CategoryFilter, string> = {all: "全部", data: "数据", chart: "图表", information: "资料", subtitle: "字幕", media: "素材", favorite: "收藏", recent: "最近"};

export const TemplateLibrary: React.FC<{
  selected: AnyTemplateManifest;
  favorites: string[];
  recentTemplates: string[];
  onSelect: (templateId: string) => void;
  onToggleFavorite: (templateId: string) => void;
}> = ({selected, favorites, recentTemplates, onSelect, onToggleFavorite}) => {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<CategoryFilter>("all");
  const [hoveredTemplate, setHoveredTemplate] = useState<string | null>(null);
  const filteredTemplates = useMemo(() => {
    const normalizedQuery = query.trim().toLocaleLowerCase("zh-CN");
    const filtered = templateCatalog.filter((candidate) => {
      const matchesCategory = category === "all" || (category === "favorite" ? favorites.includes(candidate.id) : false) || (category === "recent" ? recentTemplates.includes(candidate.id) : false) || candidate.category === category;
      const haystack = [candidate.name, candidate.description, ...candidate.tags].join(" ").toLocaleLowerCase("zh-CN");
      return matchesCategory && (!normalizedQuery || haystack.includes(normalizedQuery));
    });
    return category === "recent" ? filtered.sort((a, b) => recentTemplates.indexOf(a.id) - recentTemplates.indexOf(b.id)) : filtered;
  }, [category, favorites, query, recentTemplates]);

  return <aside className="template-panel" aria-label="模板库"><div className="panel-heading"><h2>模板库</h2><span className="count-badge">{templateCatalog.length}</span></div><label className="search-field"><span className="sr-only">搜索模板</span><input type="search" placeholder="搜索模板、用途或标签" value={query} onChange={(event) => setQuery(event.target.value)} /></label><nav className="category-row" aria-label="模板分类">{(Object.keys(categoryLabels) as CategoryFilter[]).map((key) => <button className={category === key ? "category-active" : ""} type="button" key={key} onClick={() => setCategory(key)}>{categoryLabels[key]}</button>)}</nav><div className="template-list">{filteredTemplates.map((candidate) => <div className={`template-card ${candidate.id === selected.id ? "template-item-selected" : ""}`} key={candidate.id} onMouseEnter={() => setHoveredTemplate(candidate.id)} onMouseLeave={() => setHoveredTemplate(null)}><button className="template-item" type="button" onClick={() => onSelect(candidate.id)}><span className="template-preview" style={{"--template-accent": candidate.preview.accent} as React.CSSProperties}>{hoveredTemplate === candidate.id ? <Player acknowledgeRemotionLicense component={MotionerComposition} durationInFrames={Math.max(90, candidate.capabilities.minDurationFrames)} compositionWidth={960} compositionHeight={540} fps={30} inputProps={{templateId: candidate.id, templateProps: candidate.defaultProps, assets: []}} autoPlay loop initiallyMuted controls={false} style={{width: "100%", height: "100%"}} /> : <><span className="mini-rule" /><span className="mini-label">{candidate.name}</span><span className="mini-value">{candidate.preview.label}</span></>}</span><span className="template-copy"><strong>{candidate.name}</strong><span>{candidate.durationMode} · {candidate.capabilities.maxItems ? `最多 ${candidate.capabilities.maxItems} 项` : candidate.capabilities.mediaSlots > 0 ? `${candidate.capabilities.mediaSlots} 个素材槽` : "透明"}</span></span></button><button className={`favorite-button ${favorites.includes(candidate.id) ? "favorite-active" : ""}`} type="button" aria-label={favorites.includes(candidate.id) ? "取消收藏" : "收藏模板"} onClick={() => onToggleFavorite(candidate.id)}><Star fill={favorites.includes(candidate.id) ? "currentColor" : "none"} /></button></div>)}{filteredTemplates.length === 0 && <p className="empty-templates">没有匹配的模板</p>}</div><div className="prototype-note"><strong>{selected.name}</strong><span>{selected.description}</span><span>{selected.durationMode} · 最短 {selected.capabilities.minDurationFrames} 帧 · {selected.capabilities.mediaSlots} 个素材槽</span></div></aside>;
};
