# Motioner 当前 UI 架构分析

> 分析日期：2026-08-11
>
> 分析范围：`src/renderer`、与渲染进程交互的 preload/main 边界、`docs/ui-redesign-plan.md`、`docs/design-reference/` 参考图。
>
> 本文只记录现状与阶段一施工边界，不包含 UI 代码修改。

## 1. 结论摘要

Motioner 当前不是从零开始的 UI。它已经具备常驻的模板/自由编排切换、左中右三栏、中央预览画布、模板简化时间线和自由编排完整时间线。阶段一的主要任务是重新建立这些区域的层级、稳定比例和空间约束，而不是更换技术栈或重写编辑器。

当前最明显的问题是：

- 顶部模式切换虽已存在，但夹在文件操作和项目信息之间，当前态强调较弱，尚未成为全局首要导航。
- 三栏使用固定像素宽度（292 / 自适应 / 350），在常用窗口宽度下接近 20% / 55% / 25%，但随窗口变化不稳定；两个重复的窄屏媒体查询还会互相覆盖。
- `App.tsx` 同时承担项目状态、文件工作流、渲染队列、模式布局和绝大部分事件编排，UI 骨架可读性较弱。
- 右侧检查器按自然文档流连续展开。它有独立滚动，不会直接撑开主布局，但顶部身份信息会随内容滚走，模板模式也暴露了较多项目级和输出级设置。
- 自由编排时间线已有固定高度和内部滚动，结构基本符合参考图；模板模式已有简化时间线，阶段一应保留这种差异。
- 参考图中的任意关键帧菱形编辑并不存在于当前数据模型。受“禁止修改数据模型与动画计算逻辑”约束，阶段一不能伪造或新增该能力。

## 2. 技术架构

| 项目 | 当前实现 |
| --- | --- |
| 桌面运行时 | Electron 43.3，Apple Silicon macOS |
| UI 框架 | React 19.2，函数组件与 Hooks |
| 构建 | electron-vite + Vite React 插件，pnpm 11 monorepo |
| 动效预览 | Remotion 4.0.507 `Player`，模板模式与自由编排模式共享 `MotionerComposition` |
| 图标 | `lucide-react` |
| 状态管理 | 无 Redux、Zustand、MobX 或 React Context；以 `App` 本地 state 为中心，通过 props/callback 下传 |
| 样式管理 | 单一全局 `styles.css`；CSS 自定义属性、Grid/Flex、容器查询单位、少量媒体查询；无 CSS Modules、Tailwind、CSS-in-JS 或组件库 |
| Renderer/Main 通信 | Renderer 仅通过 `window.motioner`（preload `contextBridge`）调用文件、字体、渲染、恢复和系统能力 |

### 2.1 当前页面入口

```text
src/renderer/index.html
└── src/renderer/src/main.tsx
    ├── 导入全局 styles.css
    ├── React.StrictMode
    └── App.tsx
        ├── 顶部工具栏
        ├── 三栏工作区
        ├── 底部状态栏
        ├── 恢复/错误通知
        └── 渲染队列浮层
```

`main.tsx` 还注册了全局 `error` 与 `unhandledrejection` 上报。项目没有路由，模板模式和自由编排模式是同一页面内由 `project.editorMode` 控制的条件分支。

### 2.2 Electron 边界

- Renderer 负责 UI、交互状态和 Remotion Player 预览。
- Main 负责项目文件、素材选择、字体、恢复、渲染队列与导出进程。
- UI 重构只能调整 Renderer 的布局和展示；不得改变 preload API、项目 schema、导出请求或 Remotion 组合输入。

## 3. 当前页面结构

```text
AppShell（58px 顶栏 / 主工作区 / 32px 状态栏）
├── Toolbar
│   ├── 品牌
│   ├── 文件操作（新建/打开/保存/撤销/重做）
│   ├── 模式切换（模板/自由编排）
│   ├── 项目名称与保存状态
│   ├── 分辨率/FPS/时长/格式快捷设置
│   └── 导出按钮
├── Workbench（三栏）
│   ├── 左：TemplateLibrary 或 ComponentLibrary
│   ├── 中：CanvasPanel
│   │   ├── 画布标题与预览控制
│   │   ├── Player + 可选 ComposerCanvasOverlay
│   │   └── TimelineSummary 或 ComposerTimeline
│   └── 右：InspectorPanel
│       ├── 模板 Inspector 或 ComposerInspector
│       ├── 字体
│       ├── 动画全局设置
│       ├── 工作流/项目素材
│       ├── 可选 CSV 批量面板
│       └── 输出规格
├── StatusBar
├── Recovery / ProjectError
└── RenderQueuePanel
```

当前 `.workbench` 为 `292px minmax(0, 1fr) 350px`。以 1440px 宽度估算，三栏约为 20.3% / 55.4% / 24.3%，数值接近目标，但不是可随窗口稳定缩放的比例系统。

## 4. 模板模式

### 4.1 定位理解

模板模式应是一条快速完成路径：选择模板 → 修改必要内容 → 调整样式 → 预览 → 导出。它不是完整编辑器，不应要求用户理解图层、底层动效参数或自由编排工作流。

### 4.2 相关组件

| 组件 | 文件 | 当前职责 |
| --- | --- | --- |
| 模板库 | `src/renderer/src/TemplateLibrary.tsx` | 搜索、分类、收藏、最近使用、模板选择、悬停 Remotion 预览 |
| 模板参数 | `src/renderer/src/Inspector.tsx` | 根据 manifest 字段生成文本、数字、颜色、选择、开关、媒体、数组等控件 |
| 模板预览 | `src/renderer/src/App.tsx` + `MotionerComposition` | 使用当前模板和 props 驱动 Remotion Player |
| 简化时间线 | `src/renderer/src/App.tsx` 内 `timeline-summary` | 上一帧、当前/结束时间码、intro/hold/outro 时长结构、当前帧数 |
| 批量生成 | `src/renderer/src/BatchImportPanel.tsx` | CSV 映射、预览和批量任务启动入口 |

### 4.3 现状判断

- 模板库已经是两列卡片网格，并已有缩略预览、名称和简要元数据；阶段二应在此基础上统一信息层级，而非重复实现网格。
- `Inspector` 已按 manifest 的 `content / data / source / style / animation / layout` 分组，但全部展开，没有折叠状态。
- 模板模式右侧还串联字体、全局动画、工作流、批量生成和完整输出规格，快速路径不够聚焦。
- 模板时间线已经简化，符合模式定位；阶段一只需要保证它固定在中央工作区底部且高度稳定。

## 5. 自由编排模式

### 5.1 定位理解

自由编排模式是专业制作路径：选择/拖入组件 → 画布构图 → 时间线编辑 → 属性调整 → 动效制作。它需要完整保留组件库、画布、图层时间线和节点属性，不应为了“简洁”隐藏现有控制能力。

### 5.2 相关组件

| 组件 | 文件 | 当前职责 |
| --- | --- | --- |
| 组件/动效库 | `src/renderer/src/ComponentLibrary.tsx` | 组件与动效 Tab、搜索、分类、添加组件、点击/拖拽应用动效预设 |
| 画布叠层 | `src/renderer/src/ComposerCanvasOverlay.tsx` | 节点选择、移动、八方向缩放、预览态与提交态 |
| 节点属性 | `src/renderer/src/ComposerInspector.tsx` | 可见/锁定、变换、组件字段、时序、入场/退场/循环动效与混合权重 |
| 完整时间线 | `src/renderer/src/ComposerTimeline.tsx` | 播放、图层操作、标尺、定位、拖动/裁剪、多选、波纹删除、时间槽、分段点、动效拖放 |
| 组件注册 | `src/renderer/src/composer/registry.tsx` | 组件定义、默认字段和渲染注册 |
| 动效注册 | `src/renderer/src/composer/motion-registry.ts` | 动效预设定义与查找 |

### 5.3 现状判断

- 左侧已经有“组件/动效”模式，组件点击添加、动效可拖到时间线，基础工作流完整。
- 中央画布和时间线均已存在；时间线固定为 236px，图层行区域内部滚动，已经满足“图层增加不撑开整体布局”的核心约束。
- `ComposerInspector` 当前将节点身份、变换、模板快照、组件字段、时序和动效全部连续展开，后续阶段二适合按内容/变换/布局/样式/动画重组折叠展示。
- 当前动效系统是预设 + 时序 + 强度/混合权重，并非任意属性关键帧系统。阶段三若要求“关键帧编辑”，只能先优化已有时序点/动效条的交互展示；如要任意关键帧，必须另行确认数据模型变更范围。

## 6. 时间线组件

### 模板简化时间线

- 位于 `App.tsx`，不是独立组件。
- 只表达当前帧、总时长和 intro/hold/outro 三段关系。
- 当前由中央 `CanvasPanel` 的最后一行承载，不会延伸到左右侧栏下方。

### 自由编排完整时间线

- 独立组件 `ComposerTimeline.tsx`。
- 顶部工具条和标尺以 160px 图层控制列对齐。
- 节点条支持移动和边缘裁剪；选择支持多选；提供复制、层级调整、删除和波纹删除。
- 时间槽与视频分段点都有独立标记，分段点支持拖拽调整。
- 时间线容器 `overflow: hidden`，图层区域内部 `overflow: auto`，固定高度不会因节点增加而增长。

阶段一应保持所有回调和命中区域不变，只调整中央区域的高度约束、边界和工具栏层级。

## 7. 属性面板组件

| 面板 | 当前结构 | 阶段边界 |
| --- | --- | --- |
| 模板属性 | manifest 字段分组 + 字体 + 全局动画 + 工作流 + 输出 | 阶段一只建立固定标题/独立滚动和模式身份；折叠分组留到阶段二 |
| 节点属性 | 节点身份 + 变换 + 组件字段 + 时序 + 动效 + 场景 + 字体 + 项目素材 + 输出 | 阶段一保持能力完整；折叠、重组与渐进披露留到阶段二/三 |
| 输出快捷设置 | 顶栏 `OutputQuickSettings` | 保留失焦/回车提交分辨率的既有行为 |
| 尺寸输入 | `DimensionInput.tsx` | 本地草稿，失焦或 Enter 才提交；不得改成逐字更新 |

## 8. 可复用组件与复用现状

当前可直接复用的 UI/交互组件：

- `DimensionInput`：宽高草稿、交换宽高、失焦/回车提交。
- `OutputQuickSettings`：顶部输出规格快捷入口。
- `RenderQueuePanel`：导出队列、取消、重试、显示文件。
- `BatchImportPanel`：批量导入映射与预览。
- `FieldControl`（目前定义在 `Inspector.tsx` 内）：模板字段控件分派。
- 通用 CSS 类：`.icon-btn`、`.field`、`.panel-heading`、`.inspector-section`、`.template-card`、`.alpha-badge` 等。

复用不足：

- 顶栏、模式 Tab、面板 Shell、面板固定标题和滚动内容区没有独立组件。
- 模板与自由编排检查器的 section 标题结构相似，但各自实现。
- 大量结构直接写在 `App.tsx`，后续调整容易同时影响模式逻辑与项目逻辑。

阶段一不需要为“组件化”而大规模拆文件；优先用语义容器和稳定 CSS 网格降低风险。若拆分，只拆不改变状态归属的纯展示骨架。

## 9. 状态管理方式

`App.tsx` 是全局状态中心，主要状态包括：

- 项目与历史：`project`、undo/redo、路径、dirty、保存/恢复状态。
- 预览：当前帧、播放状态、安全区、背景、缩放、低配预览。
- 选择：单选节点、多选节点、Composer 拖拽预览态。
- 工作流：收藏/最近模板、参数预设、CSV 草稿、渲染队列。

主要机制：

- React `useState` / `useMemo` / `useEffect` / `useRef`。
- `markChanged` 统一生成历史记录并标记 dirty。
- localStorage 保存收藏、最近模板、参数预设和渲染任务快照。
- 900ms 防抖自动保存通过 `window.motioner` 执行。
- 子组件通过 props 接收当前值和 callback；没有跨组件 store。

UI 重构必须保留状态所有权与 callback 契约，避免把布局调整演变为状态重构。

## 10. 样式管理方式

所有 Renderer 样式集中在 `src/renderer/src/styles.css`：

- `:root` 已定义背景、表面、边框、文字、主色和语义色 token，当前主要为 OKLCH。
- 主框架用 CSS Grid；工具栏与控件组用 Flex/Grid。
- 画布使用容器查询单位 `cqw/cqh` 做 contain 排布，横竖屏都限制在稳定预览区域内。
- 交互态主要通过 `.active`、`:hover`、`:focus-visible` 和 CSS 自定义属性完成。
- 已有 `prefers-reduced-motion` 兜底。
- 媒体查询存在顺序问题：`max-width: 1160px` 的 workbench 列宽规则会被文件后方的 `max-width: 1240px` 规则覆盖。

阶段一只修改结构尺寸、网格、固定/滚动区域和模式导航层级；计划指定的精确色值、统一圆角/边框/间距属于阶段二。

## 11. 参考图映射与阶段一目标

| 参考图结构 | 当前已有 | 阶段一动作 |
| --- | --- | --- |
| 常驻模式胶囊 Tab | 已有模板/自由编排切换 | 移到品牌后的全局导航位，增强当前态与可识别性 |
| 左侧找资源 | 已有模板库/组件库 | 保持模式条件切换，建立约 20% 的稳定资源列 |
| 中央制作 | 已有画布与预览工具 | 扩大并保证为最大列，控制工具栏溢出 |
| 右侧调整 | 已有模板/节点检查器 | 建立约 25% 的稳定属性列和独立滚动边界 |
| 下方控制时间 | 已在中央底部 | 模板固定简化时间线；Composer 固定完整时间线 |
| 模式职责差异 | 已由 `editorMode` 分支 | 通过标题、辅助说明和布局身份进一步明确，不改变功能契约 |

推荐阶段一目标比例：左侧 `clamp(248px, 20vw, 320px)`，右侧 `clamp(300px, 25vw, 380px)`，中间占剩余空间。Electron 主窗口最小宽度为 1280px，因此常用窗口下中央可稳定获得约 55%–60%。

## 12. 风险与施工约束

1. **选中清除竞态**：`App.tsx` 有 document 捕获监听。只有 `.composer-canvas-overlay`、`.composer-timeline .layer-timeline-row`、`.composer-timeline .timeline-toolbar`、`.component-library`、`.inspector-panel` 内的点击会保留节点选择。阶段一新增包裹层不能破坏这些类，新增节点操作区必须纳入保留区。
2. **预览尺寸**：画布使用恒定区域 contain 计算，不能改回按内容自然撑开。
3. **时间线稳定性**：Composer 时间线固定高度和内部滚动必须保留；模板简化时间线也应设置固定行高。
4. **顶栏溢出**：分辨率、帧率、时长、格式和导出均为既有能力。阶段一只能调整优先级和压缩策略，不能删除。
5. **模式切换是项目状态**：切换会进入 `markChanged`/`enterComposerMode` 流程，不能替换成纯本地视觉 Tab。
6. **参考图能力边界**：不新增任意关键帧、图层数据或导出行为，不把参考图中的视觉占位误当成功能需求。
7. **暂缓项**：折叠属性组、完整视觉 token、模板卡片细节和复杂交互效率优化分别属于阶段二/三，不在阶段一提前实施。

## 13. 阶段一验收清单

- 顶部“模板 / 自由编排”永久显示，当前模式一眼可辨。
- 模板模式明确呈现：左模板库 / 中预览 + 简化时间线 / 右模板参数。
- 自由编排明确呈现：左组件库 / 中画布 + 完整时间线 / 右节点属性。
- 常用窗口宽度下中央画布为最大列，左右栏各自滚动，不挤压时间线。
- 模板时间线和 Composer 时间线高度稳定，内容增加不改变主布局。
- 原有文件、预览、选择、拖拽、时间线、属性和导出入口全部保留。
- `pnpm check` 全绿，并分别验证模板模式和自由编排模式的真实 Electron 界面。
