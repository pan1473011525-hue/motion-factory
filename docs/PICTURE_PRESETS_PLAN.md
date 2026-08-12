# 图片展示预设方案（v1 · 汇总）

> 状态：**设计稿，未实施**（不修改产品代码）
> 目标：为 Motioner 新增两类图片展示模板——抖音/小红书风格（灵动活泼）与历史资料/文献风格（干净优雅）
> 日期：2026-08-12

## 1. 背景与目标

现有 46 个模板中媒体类偏"信息图/字幕"调性，缺面向社交媒体的图片展示形态。本方案分两条线：

- **线 A · 灵动展示**（抖音/小红书）：多图拼贴、瀑布流、3D 轮播、卡片滑动、聚光强调，动效轻快丝滑，竖屏（9:16 / 3:4）优先。
- **线 B · 资料展示**（历史资料/引用文献）：书封墙、档案堆叠、文献卡片、老照片相册，动效干净克制，重质感。

## 2. 资源与许可核对表（均已核实）

| 资源 | 用途 | 许可证 | 结论 |
|---|---|---|---|
| **react-photo-album**（782★） | 拼贴/瀑布流/网格布局计算（rows/masonry/grid） | **MIT** ✅ | 可直接引入，纯布局纯函数，Remotion 可用 |
| video-shotcraft `carousel-3d` | 3D 轮播 | Apache-2.0 ✅ | 直接移植（既有流程） |
| video-shotcraft `light-play-moves` | 聚光/泛光强调 | Apache-2.0 ✅ | 直接移植 |
| **SwiftClip**（41★） | 30 个生产级 Remotion 模板参考 | **MIT** ✅（LICENSE 已核实） | 参考形态，不整体内置 |
| **paper-collage-video**（189★） | 纸片分层拼贴参考 | **MIT** ✅（LICENSE 已核实） | 参考形态 |
| **remotion-ads**（53★） | 竖屏轮播广告参考 | **MIT** ✅（LICENSE 已核实） | 参考形态 |
| **swiper**（41.8k★） | coverflow/cube 3D 轮播变换数学 | **MIT** ✅ | 取公式，不引库 |
| Codrops ImageStackGrid / MenuThumbStackAnimation | 档案堆叠→网格、书封墙形态 | **MIT** ✅（仓库内 LICENSE） | 借几何概念，代码自写 |
| Codrops BookPreview / PolaroidStackGrid 等（无 LICENSE 文件） | 书封墙、宝丽来堆叠形态 | 官方政策页声明默认 MIT，仓库内无 LICENSE | **只借形态概念，不复制代码**（规避风险） |
| react-polaroid-photo-deck（27★） | 宝丽来堆叠 | **MIT** ✅ | 参考 |
| papercss（4190★） | 纸张纹理/手写风格 CSS 思路 | ISC ✅ | 参考 |
| ~~reactvideoeditor/remotion-templates~~ | — | **无 LICENSE** | 不可用 |
| ~~nnattawat/flip~~ | 3D 翻转 | 许可证存疑 | 不可用 |
| ~~contentloop~~ | — | AGPL-3.0 | 不可用 |

## 3. 模板设计

### 线 A · 灵动展示（6 个）

| # | 模板 id | 名称 | 媒体槽 | 动效要点 | 底座 |
|---|---|---|---|---|---|
| A1 | `photo-grid-collage` | 九宫格拼贴 | 4–9 图 | grid 布局；逐张错峰弹入（scale 0.82→1 + rotate ±4°→0 + 浮起），落地轻回弹 | react-photo-album grid |
| A2 | `photo-masonry` | 瀑布流 | 4–9 图 | masonry 布局；整墙纵向缓慢滚动 + 逐张浮起，小红书首页感 | react-photo-album masonry |
| A3 | `photo-row-strip` | 卡片横流 | 4–8 图 | rows 等宽；卡片从左向右依次滑入，当前卡微放大，可循环 | react-photo-album rows |
| A4 | `carousel-3d` | 3D 轮播 | 4–8 图 | 卡片 rotateY 立体轮播，当前卡居中放大，两侧退远 | video-shotcraft `carousel-3d` |
| A5 | `spotlight-photo` | 聚光强调 | 1–3 图 | 暗场聚光灯扫过，逐张揭示；光斑软边 | video-shotcraft `light-play-moves` |
| A6 | `polaroid-photo` | 动态相框 | 3–6 图 | 宝丽来白边相框，堆叠散开，轻微旋转定格；可叠标签浮层 | 形态参考（自写） |

公共参数：`title`（可选）、`gap`、`radius`、`accentColor`、`stylePreset`；动效时长 `fixed-edges`（入场完成后持有）。

### 线 B · 资料展示（3–4 个）

| # | 模板 id | 名称 | 媒体槽 | 动效要点 | 底座 |
|---|---|---|---|---|---|
| B1 | `archive-stack` | 档案堆叠 | 4–6 图 | 一叠资料从中心散开成网格，位移/旋转克制缓动，纸张白边阴影 | Codrops ImageStackGrid 概念 |
| B2 | `book-shelf` | 书封墙 | 4–8 图 | 书封网格逐排滑入，定格时轻微摆动回正；可叠标题 | Codrops BookPreview 概念 |
| B3 | `document-card` | 文献卡片 | 3–6 图 | 引用文献卡片错位堆叠、逐张浮起，档案标签（编号/年份）+ 可选纸纹 | Codrops StackMotion 概念 + papercss 思路 |
| B4 | `sepia-album` | 老照片相册 | 4–6 图 | sepia 滤镜 + 轻微颗粒 + 印章水印 + 纸纹底，照片错峰淡入堆叠 | 纯 CSS 滤镜（自写） |

公共参数：`caption`/`year`（档案标签）、`sepia`（是否老照片滤镜）、`accentColor`、`stylePreset`。

## 4. 实施方式与工作量

- **react-photo-album 引入**：新依赖（MIT）。验证其在 Remotion headless 渲染下布局计算正常（纯函数，预期可行，实施时先 PoC 一帧）。
- **video-shotcraft 卡移植**：延续既有流程（文件头 Apache 声明 + 参数化 + 媒体槽替换）。
- **Codrops 形态**：只借几何概念，代码全部自写（规避无 LICENSE 风险）。

| 批次 | 内容 | 预计 |
|---|---|---|
| 第一批 | react-photo-album PoC + A1/A2/A3 拼贴三件套 | 1.5–2 人日 |
| 第二批 | A4/A5/A6（3D 轮播 / 聚光 / 相框） | 1–1.5 人日 |
| 第三批 | B1–B4 资料展示四件套 | 1.5–2 人日 |

## 5. 合规

- 引入依赖：react-photo-album（MIT，THIRD_PARTY_NOTICES 登记）。
- 移植组件：video-shotcraft 文件头 Apache 声明（沿用既有约定）。
- Codrops 形态参考：自写代码，不复制，文档注明形态出处。
- 无任何 GPL/无 LICENSE 依赖进入。

## 6. 决策点

1. 范围：A 6 个 + B 4 个全做（约 4-5 人日），还是先 A 3 个（拼贴三件套）验证 react-photo-album 再铺开？
2. B4 `sepia-album`（老照片滤镜）是否需要（历史资料场景可选，做成公共滤镜层更通用）？
3. A6/A1 是否合并（polaroid 相框本质是拼贴的一种）——本方案默认拆分（风格差异明显）。
