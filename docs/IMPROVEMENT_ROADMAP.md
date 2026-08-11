# Motioner 功能改进路线图(对标开源调研)

> 本文档是 **逐步可执行的实施指导**,供后续任意一次开发会话(Reasonix 或 Codex)直接接手:
> 每一条改进都写清了「为什么做、现状在哪、改哪些文件、怎么做、怎么验收」。
> 请按「第四部分:推荐实施顺序」逐条推进,不要跳步、不要并行改动多个方向(避免冲突)。
> 若某一步与代码现状不符(本文档基于 v1.3.1 编写),先更新本文档再实施。

---

## 一、项目背景速览(接手者必读)

Motioner 是一款仅面向 **Apple Silicon macOS** 的本地透明动效生成器(Electron + React + Remotion 4.0.507 + pnpm 11 monorepo)。

- 双工作流:模板快速生成 + 自由编排画布(Composer)。
- 动画模型:**帧号驱动的纯函数**——预览(Remotion Player)与导出(Headless Chrome 渲染)复用同一组件,相同输入得到相同输出。
- 导出:ProRes 4444 / 4444 XQ、PNG RGBA 序列、H.264 yuv420p;独立 Utility Process 渲染队列。
- 已交付能力详见 `README.md`;架构与数据流详见 `docs/ARCHITECTURE.md`;用户手册 `docs/USER_GUIDE.md`。

### 关键文件地图(后续所有改动都会涉及)

| 关注点 | 文件 |
|---|---|
| 主进程/渲染调度/IPC | `src/main/index.ts`(29KB 核心)、`src/main/render-worker.ts`(每任务独立进程) |
| 渲染队列 | `src/main/render-queue.ts`、`src/renderer/src/render-job.ts`、`src/renderer/src/RenderQueuePanel.tsx` |
| 导出预设/空间估算 | `src/shared/export-presets.ts`、`src/shared/export-estimate.ts` |
| Composer 注册表/动效预设 | `src/composer/registry.ts`(`motionPresets` 第 226 行起)、`src/composer/runtime.tsx` |
| 项目/画布/动画模型 | `packages/project-model/src/index.ts`(类型:ComposerComposition/ComposerNode/MotionProject) |
| 模板协议/schema | `packages/template-sdk/src/`、`src/templates/catalog.ts` |
| 预览与布局 | `src/renderer/src/App.tsx`(画布 861-867 行、空格快捷键 537-550 行、点击清除选中 552-565 行) |
| 时间线 | `src/renderer/src/ComposerTimeline.tsx` |
| 画布交互 | `src/renderer/src/ComposerCanvasOverlay.tsx` |
| 样式 | `src/renderer/src/styles.css`(`.stage-wrap`/`.player-frame` 约 855-905 行) |
| 打包配置 | `package.json`(`build` 字段)、`electron.vite.config.ts`、`scripts/after-pack.cjs` |

### 常用命令

```bash
pnpm check            # lint + typecheck + 47 项单测
pnpm dev              # remotion bundle 后 electron-vite dev
pnpm package:dmg      # build + electron-builder dmg + verify + package-e2e
```

---

## 二、十个改进方向总览

| # | 方向 | 梯队 | 预估改动面 |
|---|---|---|---|
| 1 | 对齐 Remotion 官方 Electron 发布架构 | 一(发布工程) | 打包配置、主进程 |
| 2 | 渲染参数与可靠性补齐 | 一(渲染质量) | render-worker、main |
| 3 | 引入 @remotion/media / media-utils / animation-utils | 一(媒体能力) | 媒体组件、素材检查器 |
| 4 | 时间轴对齐 `<Sequence>` 语义 + transitions | 一(编排能力) | runtime、时间线模型 |
| 5 | 时间线交互补强(吸附/多选/波纹/干跑) | 二(编辑体验) | ComposerTimeline |
| 6 | Time Events 式时间槽(具名事件) | 二(参数化) | 模板 schema、时间线 |
| 7 | 动效预设 → 片段 + mix 权重混合 | 二(动效引擎) | composer registry、runtime |
| 8 | Lottie/dotLottie 导出 | 三(开放输出) | 导出管线、新依赖 |
| 9 | 分段导出 + 机器可读元数据 | 三(开放输出) | render-worker、导出报告 |
| 10 | 预览/渲染双档 + 静止段缓存 | 三(性能) | 预览、缓存层 |

---

## 三、各方向详细实施指导

> 每条含:动机 / 现状(代码位置)/ 目标 / 实现步骤 / 验收标准 / 风险。
> 所有 Remotion API 均以项目当前版本 **4.0.507** 为准(下文列出的新特性均在该版本内可用)。

---

### 1. 对齐 Remotion 官方 Electron 发布架构

**动机**:当前打包存在隐患(见 README 与 `scripts/after-pack.cjs`):Remotion compositor 原生二进制、Headless Chrome 的放置方式若不按官方约定,发布包在用户机器上会找不到渲染依赖。此前打包已出现 electron-builder 下载超时,发布链路值得按官方模板固化。

**现状**:`package.json` 的 `build.files` 只打包 `out/**/*` + `package.json`;`extraResources` 包含 `dist/remotion` 与 `vendor/chrome-headless-shell`;`afterPack` 钩子在 `scripts/after-pack.cjs`。

**目标**:发布包在**打包期**预构建 Remotion bundle、compositor 放在 `app.asar.unpacked`、浏览器实例在渲染前就绪,不依赖运行时 bundle 与首次下载。

**实现步骤**:
1. 阅读官方模板作对照:`remotion-dev/remotion/tree/main/packages/template-electron`(文档 https://www.remotion.dev/docs/electron)。
2. 把 `remotion bundle` 的输出 `dist/remotion` 作为打包期产物(现状已满足,`package:dmg` 先 `pnpm build`)。
3. 将 `@remotion/compositor-darwin-arm64` 的原生二进制配置为 `asarUnpack`(当前 `asarUnpack` 已含 `node_modules/@remotion/**/*`,确认生效),渲染时把 compositor 路径指向 `app.asar.unpacked`。
4. 发布前用 `scripts/verify-package.mjs` + 全新用户目录跑一次 E2E,确认首次运行不下载任何依赖。

**已实施(2026-08-10)**:`scripts/after-pack.cjs` 增加打包期 compositor 存在性校验(缺失立即报错,避免发布后首次导出才暴露)。

**重要调研结论**:`@remotion/renderer` 4.0.507 的**公开 API**(`renderMedia`/`renderFrames`/`selectComposition`)**不接受浏览器实例参数**(`browser`/`puppeteerInstance` 仅存在于内部 API `internalRenderMedia`),每次渲染由 Remotion 内部自行启动浏览器。因此「`openBrowser()` 跨渲染复用浏览器实例」在本版本**不可行**,不要走内部 API(不稳定)。可接受的替代:渲染失败重试(见方向 2)。

**验收**:在一台干净用户目录下打开打包应用,完成一次 ProRes 导出,无网络请求、无缺失依赖报错;`pnpm check` 与 `pnpm package:dmg` 全绿。

**风险**:asar 内路径解析(生产环境 `__dirname` 指向 asar 内部,原生二进制必须走 unpack 路径);改动后需重新跑 `package-e2e.mjs`。

---

### 2. 渲染参数与可靠性补齐

**动机**:调研显示 Remotion 渲染有大量可靠性/性能开关,当前只用了其中一部分。

**现状(已实现,勿重复)**:
- `src/main/render-worker.ts` 已使用 `renderMedia`、`muted: true`(无音频导出)、`concurrency: "50%"`(396-427 行附近)。

**待补齐项**:
1. `offthreadVideoCacheSizeInBytes`:给足媒体帧缓存(**已实施 2026-08-10**:renderFrames/renderMedia 显式 512MB)。
2. 失败自动重试(**已实施 2026-08-10**):渲染失败(浏览器/compositor 崩溃等瞬时故障)自动重试一次;用户错误(磁盘不足、缺失素材、校验失败、已存在等)不重试。`src/main/render-worker.ts` 的 `shouldRetryRender` + `retriedJobs`。
3. `frameRange` 多段区间:支持「导出选区」——**并入方向 9(分段导出)一起做**,避免重复改动数据流。
4. 取消与进度:确认 `cancelSignal` 走通(现状队列已有取消,render-worker 已透传 `cancelSignal`)。
5. `@remotion/animation-utils` 的 `interpolateStyles`/`makeTransform`:作为动效预设的底层工具,减少手写插值(与方向 3 协同)。

**验收**:分别导出 1080p 30s 与 4K 10s 各一次,取消/重试路径可稳定复现;`pnpm check` 全绿。

**风险**:`concurrency` 与 `offthreadVideoCacheSizeInBytes` 配比影响内存峰值,需在目标机型上压测;不要随意上调超过物理内存一半。

---

### 3. 引入 @remotion/media / media-utils / animation-utils

**动机**:当前素材(视频)在 Remotion 组件中的播放/解码方式可能是手写 HTMLVideo(`src/remotion/` 内),并行解码、元数据探测、波形可视化都可用官方包替代,减少自维护成本。

**现状**:`package.json` 未含 `@remotion/media`、`@remotion/media-utils`;`@remotion/animation-utils` 未引入。素材相关逻辑在 `src/main/media-cache.ts`、`src/shared/`、`src/remotion/`。

**实现步骤**:
1. `pnpm add @remotion/media@4.0.507 @remotion/media-utils@4.0.507 @remotion/animation-utils@4.0.507`(锁定版本与 Remotion 一致)——**已安装 2026-08-10**。
2. 用 `@remotion/media` 的 `<Video>/<Audio>` 替换手写 HTMLVideo(渲染端 Offthread、预览端 Html5 行为,支持 `trimBefore/trimAfter/playbackRate`),替换现有视频组件——**已实施 2026-08-10**:`src/remotion/primitives.tsx` 的 `MediaSlot` 视频分支由 `Freeze + OffthreadVideo + 手写帧计算` 改为 `<Video src trimBefore trimAfter playbackRate loop muted>`,`once` 播完消失语义保留在外层。冒烟渲染(含真实视频素材场景)通过。
3. 用 `@remotion/media-utils` 的 `getVideoMetadata/getAudioData` 替换或增强 `src/main/media-cache.ts` 的元数据探测——**不适用(结论)**:`media-cache.ts` 是主进程 ffprobe 探测(`durationSeconds` 已写入 ProjectAsset),`media-utils` 是浏览器端包,不替代主进程逻辑;检查器展示素材时长属 UI 增强,另行评估。
4. 用 `animation-utils` 重构 `src/composer/registry.ts` 中动效预设的插值计算——**已安装,暂不改动(结论)**:`runtime.tsx` 的 transform 用独立 CSS 属性(translate/scale/rotate)组装,行为稳定;`makeTransform/interpolateStyles` 留待方向 7(mix 权重混合)时作为组合工具使用,避免无收益的有风险重构。
5. 在素材导入流程中接入:导入视频时记录 `trimBefore/trimAfter/playbackRate` 参数(现状已有入点/出点/倍速,核对字段名)。

**验收**:预览与导出视频素材行为一致(帧精确);导入的视频在检查器中显示正确时长/尺寸;`pnpm check` 全绿。

**风险**:@remotion/media 为 4.0 新包,注意其 peer 依赖与打包体积;替换后必须跑 `package-e2e.mjs`(它真实渲染视频素材)。

---

### 4. 时间轴对齐 `<Sequence>` 语义 + @remotion/transitions 转场

**动机**:Composer 图层时间轴(移动/修剪/寻帧)目前在 `src/composer/runtime.tsx` 中自行实现;Remotion `<Sequence>` 已原生支持 `from/durationInFrames/trimBefore/freeze/premountFor/hidden/showInTimeline/cropLeft...`(4.0.476-4.0.501 引入),对齐后能获得官方性能与正确性保证,并白拿 `@remotion/transitions` 的转场。

**现状**:`src/composer/runtime.tsx` 自实现图层渲染;`src/renderer/src/ComposerTimeline.tsx` 是时间线 UI;节点时序字段在 `packages/project-model` 的 `ComposerNode.timing {from, durationInFrames}`。

**实现步骤**:
1. 阅读 https://www.remotion.dev/docs/sequence 与 https://www.remotion.dev/docs/transitions。
2. 将 `runtime.tsx` 中每个图层改为 `<Sequence from={node.timing.from} durationInFrames={node.timing.durationInFrames}>` 包裹(保持数据模型不变,仅渲染层对齐)。
3. 为「模板场景节点」接入 `@remotion/transitions` 的 `TransitionSeries + fade/slide/wipe` 作为模板内场景切换转场(先做 1 个模板验证,再推广)。
4. 评估 `premountFor`/`postmountFor` 消除 seek 闪烁;`hidden` 对齐现有图层显隐。

**已确认/结论(2026-08-10)**:
- `src/composer/runtime.tsx` 的 `ComposerComposition` **已用 `<Sequence from={node.timing.from} durationInFrames={node.timing.durationInFrames} layout="none">` 实现图层时间轴**,数据模型(`ComposerNode.timing`)与渲染层已对齐,无需改动。
- `premountFor`/`postmountFor` 在 Remotion 4.0.507 的**公开 Sequence props 类型中不存在**(仅内部 `no-react` 类型),不建议使用,seek 闪烁维持现状。
- `@remotion/transitions` **不引入**:`media-carousel`(素材轮播)模板已有自定义 `transition: slide | cut | crossfade` 参数并通过检查器暴露;Composer 图层模型是并行图层而非串行序列,`TransitionSeries` 不适配;重写模板引入官方转场风险大于收益。

**验收**:时间线拖动、修剪、播放、seek 行为与现状一致(或更好);转场在预览与导出中一致;`pnpm check` + 视觉回归(见 README visual:* 命令)通过。

**风险**:`<Sequence>` 语义与现有自实现可能有边界差异(如负偏移、重叠),需逐个模板回归;先只改渲染层,不动数据模型。

---

### 5. 时间线交互补强(吸附 / 多选分组 / 波纹 / 干跑校验)

**动机**:调研 Shotcut/Kdenlive/Blender VSE:专业时间线必备「吸附、多选、波纹(ripple)/覆写(overwrite)区分、操作前干跑校验」。Motioner 当前时间线只有移动/修剪/寻帧。

**现状**:`src/renderer/src/ComposerTimeline.tsx`(行点击选择、拖拽移动/修剪);`timeline-interaction.ts`(纯函数,已有测试);吸附相关:`App.tsx` 的 `snapToGrid` 仅用于画布网格,不用于时间线。

**实现步骤**:
1. **吸附**:在 `timeline-interaction.ts` 增加 `snapTimelinePosition(from, duration, snapTargets)` 纯函数,吸附目标 = 其他图层的边界、画布 0/结束帧、播放头;时间线拖动时按住 Alt 临时禁用(与画布网格交互一致)。
2. **多选**:`ComposerTimeline` 增加 `selectedNodeIds: string[]` 状态(由 App 传入),支持 Shift 点选/框选;多选时批量移动/修剪。
3. **波纹删除**:`App.tsx` 的 `deleteSelectedNode` 增加「删除并左移后续图层(ripple)」选项(仿 Shotcut 的 `trimClipIn(..., ripple, rippleAllTracks)` 语义),保留现有「仅删除」。
4. **干跑校验**:所有时间线编辑先对数据模型跑校验(复用 `validateComposerComposition`,见 `src/composer/registry.ts`),无效则拒绝并提示,不落盘。

**已实施(2026-08-10)**:
- 吸附:`timeline-interaction.ts` 新增 `snapFrame(frame, targets, tolerance=6)` 纯函数 + 单测;`ComposerTimeline` 拖动(scrub/move/trim-start)接入,吸附点=首末帧/播放头/各图层起止,Alt 临时禁用。
- 多选:`App.tsx` 新增 `multiSelectedIds` 状态与 `selectNodeOnly/selectNodeExtend`,时间线行 Shift 点选切换多选、`.multi-selected` 高亮;删除/波纹删除作用于全部多选。
- 波纹删除:`App.tsx` 的 `deleteSelectedNodes(ripple)` 按被删图层起始帧顺序左移后继图层,时间线工具栏新增「波纹删除」按钮。
- 干跑校验:`ComposerTimeline` 新增 `onValidate` 钩子,拖动/修剪提交前用 `validateComposerComposition` 校验,不合法则丢弃不落盘。

**UI 交互补强(2026-08-11)**:
- 时间线素材条、素材轨道、裁剪柄和动效关键点在寻帧/拖动前统一激活所属图层，锁定图层仍允许选中但不允许编辑。
- 素材条改为可聚焦按钮，支持 Enter/Space 选择；时间线目标通过 `data-timeline-node-id` 在捕获阶段解析，避免只能点击左侧名称才能选中。
- 时间线根节点使用 pointer capture 持续接收拖动事件，后续 click 可能重定向到根节点；因此 `App.tsx` 的全局清除选中保留区改为整个 `.composer-timeline`，并使用 `composedPath()` 判断，避免刚选中即被清空。
- 画布顶部移除与时间线重复的播放、逐帧和首尾按钮，完整运输控制集中到时间线工具栏。

**验收**:吸附点可视化提示;多选批量操作;波纹删除后时序无重叠;非法操作被拦截;新增单测覆盖 `timeline-interaction.ts`(参照现有 `timeline-interaction.test.ts`)。

**风险**:多选会改变 `selectedNodeId` 的语义(单选 vs 多选),需在 App 层做好兼容;改动面较大,建议分 3 个小 PR 落地(吸附 → 多选 → 波纹)。

---

### 6. Time Events 式时间槽(具名事件)

**动机**:Motion Canvas 的 `waitUntil('event')` + 编辑器拖拽 + `useDuration('event')` 把「等待点」从硬编码时长抽象为**具名时间槽**,参数面板与时间轴双向驱动。对参数化模板是差异化优势(用户可在时间轴上直接调整「标题入场后停 0.5s 再出图表」这类时刻)。

**现状**:模板时长由 `manifest.capabilities`/`durationMode` 控制(`packages/template-sdk/src`、`src/templates/catalog.ts`);模板组件内的时间点多为硬编码帧数。

**实现步骤**:
1. 在 `packages/project-model` 定义 `TimeSlot {id, label, frame}` 类型与序列化;模板 manifest 增加 `timeSlots?: TimeSlotSchema[]`。
2. 在 `ComposerTimeline` 渲染具名事件 pill(类似 Motion Canvas 时间轴),支持拖拽改帧、Shift 拖拽单独调整、顺延后续事件。
3. 模板组件通过 props 接收 `timeSlots` 映射(如 `enterAt/slot('title-in')`),替代硬编码帧。
4. 检查器暴露每个 slot 的帧数值输入(与拖拽双向同步)。

**已实施(2026-08-10,项目级时间槽基础设施)**:
- `packages/project-model`:新增 `timeSlotSchema` 与 `MotionProject.timeSlots`(default `[]`,v2 项目自动带空数组,v1 迁移无损)。
- `App.tsx`:`addTimeSlot`(当前播放头创建)/`updateTimeSlotFrame`/`removeTimeSlot`,随 `markChanged` 持久化与自动保存。
- `ComposerTimeline`:工具栏「＋标记」按钮;`timeline-ruler` 上渲染时间槽 pill(标签+删除钮),支持拖拽改帧(复用 `snapFrame` 吸附,Alt 临时禁用)。
- **模板组件消费(未做,留待后续)**:让模板 schema 声明具名时刻并消费 `timeSlots` 需要扩展 template-sdk 的字段体系(新增「时间槽引用」控件类型)与模板运行时,作为独立后续任务;当前时间槽数据已就绪、可被分段导出(方向 9)等消费。

**验收**:新增一个演示模板,其动效时刻可由时间线拖拽调整且预览/导出一致;slot 值随项目保存/加载;`pnpm check` 全绿。

**风险**:这会引入「模板内具名时刻」概念,需要模板开发者指南(`docs/TEMPLATE_DEVELOPMENT.md`)同步更新;建议先做一个模板试点。

---

### 7. 动效预设 → 片段 + mix 权重混合

**动机**:Rive 把动画做成「时间轴片段(State)+ 过渡(Transition)」,多动画用 **mix 权重(0..1)平滑混合**而非硬切换。Motioner 的 16 个动效预设目前是「整体应用、无曲线编辑器」。

**现状**:`src/composer/registry.ts` 的 `motionPresets`(第 226 行起)定义 `MotionPresetDefinition`,节点 `motion: {enter, exit, loop}` 各存一个 preset id;`runtime.tsx` 按预设整体求值。

**实现步骤**:
1. 数据模型:节点 `motion` 增加 `weights?: {enter?: number; exit?: number; loop?: number}`(默认 1),允许「入场 60% + 循环 40%」叠加。
2. `runtime.tsx`:同一时刻对叠加的预设分别求值,按权重 lerp 合并(先支持位置/透明度/缩放,不支持旋转叠加的做降级:只取权重最高者)。
3. 动效卡片 UI(`src/renderer/src/ComponentLibrary.tsx`)增加权重滑杆(0-100%),默认全量。
4. 保持现有「点击勾选、拖入时间线」交互不变,只增加权重控制。

**已实施(2026-08-10)**:
- `packages/project-model`: `ComposerNodeMotion` 新增 `mix: {enter, exit, loop}`(0..1,default 全量),`createComposerNode` 默认全量。
- `runtime.tsx`:`getComposerMotionStyle` 将入场/退场 progress 按 `mix` 插值(`weightedEnter = 1+(progress-1)*mix.enter`),循环位移/缩放/旋转/明暗按 `mix.loop` 缩放——**mix=1 完全还原原行为**,`mix=0` 关闭该通道,天然安全无需混合矩阵白名单。
- `ComposerInspector`:「动效强度」改名「整体强度」(保留 0-2× 全局倍率),新增入场/退场/持续三通道权重滑杆(0-100%)。
- 旧项目数据无 `mix` 字段时运行时用 `?? {1,1,1}` 容错,兼容无损。

**验收**:一个节点可叠加两个动效且过渡平滑;权重 0 等价于未应用;导出与预览一致;`pnpm check` 全绿。

**风险**:任意两预设混合不一定语义自洽(如两个方向相反的位移动效),需定义「可混合矩阵」白名单,避免不可预期结果。

---

### 8. Lottie / dotLottie 导出

**动机**:Lottie 是开放 JSON 动效标准,`lottie-js`/`relottie` 提供对象模型,可从「图层+关键帧数据」直接生成 Lottie JSON;dotLottie 容器可内置多动画/主题/状态机/音频。**注意:不存在「CSS/JS/React 动效→Lottie」的成熟方案**,所以本方向是从 Motioner 的**结构化数据**(不是从浏览器运行结果)生成 Lottie。

**现状**:导出均为视频(`src/shared/export-presets.ts` 的 `EXPORT_PRESETS`);Composer 节点有 transform/timing/motion 结构化数据。

**实现步骤**:
1. 调研 `LottieFiles/lottie-js`(对象模型)与 `dotlottie-js`(打包 `.lottie`)的 API。
2. 在 `packages/project-model` 增加「节点+时间线 → Lottie JSON」序列化器:支持变换(位置/缩放/旋转/透明度)、单层形状、入场/退场时间映射为 Lottie 时间线。
3. 新导出预设「Lottie JSON」:走 `EXPORT_PRESETS` 体系,导出时同时生成 `.lottie` 容器(可选)。
4. 预览:用 `lottie-web` 在检查器/导出面板回放生成的 Lottie,验证一致性(像素级不要求,结构级即可)。

**已实施(2026-08-10,POC 可表达子集)**:
- `src/shared/lottie-export.ts`:Composer 场景 → 标准 Lottie JSON(v5.7.4)序列化器。支持 `rectangle/ellipse`(shape layer + 填充色)、文字组件(标题/正文/引语/标签/注释卡/人名条 → text layer 系统字体);transform(位置/锚点/旋转/不透明度)、`timing`(inPoint/outPoint);动效关键帧(fade → opacity、rise/drop/slide → position、scale/pop → scale,按 mix 权重缩放);图片/视频/图表等跳过并返回 warnings。
- 导出预设 `lottie-json`(kind `lottie`,扩展名 `.json`);`render-worker.ts` 新增分支(无需 Remotion 渲染,直接序列化写文件 + `validateLottieOutput` 结构校验),接入现有队列/报告/校验体系。
- 6 项单测:`src/shared/lottie-export.test.ts`(文档结构、shape/text 映射、关键帧、zIndex 排序、跳过警告)。
- **未做(后续)**:dotLottie 容器打包(`dotlottie-js`)与 lottie-web 回放预览 UI;`lottie-js` 对象模型重构序列化器(当前手写 JSON 更可控)。

**验收**:一个含文字+矩形+位移动效的 Composer 项目可导出 Lottie 并被 lottie-web 正常播放;导出面板可回放;`pnpm check` 全绿。

**风险**:Lottie 表达力 < 浏览器 CSS/JS(滤镜、混合模式、字体渲染不支持),需明确「仅导出 Lottie 可表达的子集」并在 UI 标注;这是最大风险,建议先做 POC 再全量。

---

### 9. 分段导出 + 机器可读元数据

**动机**:Manim 的 `next_section()` + `sections.json`(codec/宽高/帧率/时长/帧数)明确为自动化剪辑工具设计;Motioner 已有 `.motioner.json` 导出报告,补上「按段落切分 + 结构化元数据」即可无缝进入下游剪辑/合成管线。

**现状**:`render-worker.ts` 全片渲染;导出后写 `.motioner.json` 报告(见 README);`src/main/render-queue.ts` 管理队列。

**实现步骤**:
1. 在 `render-worker.ts` 支持 `frameRange` 多段区间(与方向 2 的第 3 项联动),导出多段视频文件。
2. 模板/项目增加「段落」(segment)概念:`{id, label, from, to}`,在时间线 UI 标注段落边界,可手动调整。
3. 导出时生成 `sections.json`:每段含 `codec_name/width/height/avg_frame_rate/duration/nb_frames`(复用现有 FFprobe 断言代码,见 `src/main/` 的校验逻辑),与 `.motioner.json` 一并输出。

**已实施(2026-08-10,分段点 + sections.json)**:
- `packages/project-model`:新增 `segmentSchema` 与 `MotionProject.segments`(分段点数组,按帧号排序,default `[]`)。
- 时间线 UI:工具栏「＋分段」按钮(当前播放头加分段点,自动去重排序),`timeline-ruler` 上渲染橙色虚线分段线 + 标签 + 删除钮。
- `render-worker.ts`:导出视频且项目有分段点时,输出 `${输出}.sections.json`(每段 label/fromFrame/toFrame/frameCount/durationSeconds + 整片 codec/宽高/fps/色彩空间),与 `.motioner.json` 一并交付。

**已实施(2026-08-11,多文件分段导出 + 分段点拖拽)**:
- 项目导出选项新增 `exportOptions.segmented`(旧项目默认 `false`);输出规格面板增加「分段导出」开关,仅在视频格式且存在分段点时可用,并明确提示输出文件数量。
- 开启后选择一个独立输出文件夹;`render-worker.ts` 按计算后的每个闭区间依次调用 Remotion `renderMedia({frameRange: [from, to]})`,输出 `01-段-1.*`、`02-段-2.*` 等视频。每段独立写入 Rec.709 元数据,再经 FFprobe 帧数/编码/尺寸/帧率/色彩校验与 FFmpeg 全片解码校验;全部成功后才原子提升整个目录。
- 输出文件夹内包含 `sections.json` 与 `motioner-export-report.json`;`sections.json` 每段记录 `fileName/codec_name/width/height/avg_frame_rate/duration/nb_frames/fileSizeBytes` 及原始时间线边界。未开启分段导出时继续保留原整片文件及 sidecar,兼容既有下游流程。
- `src/shared/section-export.ts` 集中负责段边界排序/去重/过滤、名称清理和清单结构;新增单测覆盖边界计算、旧默认标签重排、安全文件名与 FFprobe 字段。
- 时间线分段点支持拖拽调整(Alt 临时取消吸附),限制在首末帧之间并拒绝与其他分段点重合;缩短项目时长时同步收拢/去重分段点。
- `test:exports` 新增三段 H.264 真实渲染场景;`package-e2e` 改为在打包应用内输出并核验三段文件及 `sections.json`,覆盖生产包资源路径。

**验收**:勾选「分段导出」后输出多段文件 + `sections.json`,字段与 FFprobe 实测一致;单测覆盖段边界计算;`package-e2e` 通过。

**风险**:段边界与动效时序耦合,建议段=时间线标记,不自动推断;低优先,可与方向 2 的 frameRange 一起做。

---

### 10. 预览/渲染双档 + 静止段缓存

**动机**:Manim 把静止对象预渲染成背景、Motion Canvas 预览/渲染分档;Motioner 大项目(4K、长时长)预览与参数微调会慢。缓存「未变化段落」可显著加速迭代。

**现状**:预览与导出共用同一组件(`App.tsx` 中 `Player` + `renderMedia` 同源),已具备「同源」正确性,但无缓存、无分档。

**实现步骤**:
1. **双档预览**:`App.tsx` 预览缩放已支持 `previewZoom`;在此基础上增加「预览低配」开关(渲染时把内部画布临时降为 0.5× 分辨率、帧率减半),导出保持全配。注意保持同源组件,只改分辨率参数。
2. **静止段缓存**(远期):在 `render-worker.ts` 或渲染调度层,对「参数未变化的帧区间」复用缓存帧(参考 Manim partial movie)。数据模型上给项目加 `renderCache: {segmentHash, frames[]}`。
3. 为参数哈希建立工具函数(输入 = project 的 props/canvas/animation 子集,`packages/project-model` 提供),变化时失效。

**已实施(2026-08-10,双档预览)**:
- `App.tsx`:`previewLowQuality` 开关,canvas-toolbar 新增「低配预览」按钮;开启时 Player 的 `compositionWidth/Height` 减半(同源组件,导出不受影响)。
- **重要修正**:帧率**不能**减半——Motioner 动画由帧号驱动(帧→时间映射),降低 fps 会改变动画速度;低配只降分辨率,保持 fps。
- **静止段缓存(未做,远期探索)**:帧缓存正确性难保证(字体/外部素材时间变化),风险高于收益;按文档约定「缓存默认关闭、仅显式开启」暂缓,保留为路线图后续项。

**验收**:4K 项目预览拖动明显更流畅(低配档);相同参数二次渲染跳过未变化段(可观测到用时下降);导出结果与无缓存一致(关键!需 diff 验证)。

**风险**:帧缓存正确性难保证(字体、外部素材时间变化);缓存默认关闭、仅显式开启;先做双档预览(低风险),静止段缓存列为远期探索。

---

## 四、推荐实施顺序(里程碑)

> 原则:先「不改变用户行为、只提升工程可靠性与性能」的改动,再做「改变交互与能力」的改动;
> 每完成一个方向,`pnpm check` + 相关 e2e 必须全绿再进入下一个。

**里程碑 A(工程加固,1-2 个会话)** — 方向 1、2
- 发布链路稳固(打包期预构建、compositor unpack、浏览器复用、按帧重试、导出选区)。
- 产出:发布包在干净环境可用;导出失败可重试可取消。

**里程碑 B(媒体与编排基础,2-3 个会话)** — 方向 3、4
- 官方媒体工具链替换手写实现;时间轴渲染层对齐 `<Sequence>` + 转场。
- 产出:视频素材帧精确、转场可用;行为回归无差异。

**里程碑 C(编辑体验,2-4 个会话)** — 方向 5、6
- 时间线吸附/多选/波纹/干跑;具名时间槽。
- 产出:时间线达到「专业动效编排工具」体验;1 个试点模板用上时间槽。

**里程碑 D(动效引擎与开放输出,2-4 个会话)** — 方向 7、8、9
- mix 权重混合;Lottie 导出 POC;分段导出 + sections.json。
- 产出:动效可叠加;可导出 Lottie 子集;下游剪辑可自动化消费。

**里程碑 E(性能,远期探索)** — 方向 10
- 双档预览先行,静止段缓存试点。
- 产出:大项目预览流畅;缓存开启时二次渲染加速。

---

## 五、参考资料(实施时直接查阅)

- Remotion 官方文档:https://www.remotion.dev/docs/(Sequence / transitions / media / media-utils / animation-utils / delay-render / renderMedia / electron / staticfile / lottie / prefetch)
- Remotion 官方 Electron 模板:`remotion-dev/remotion/tree/main/packages/template-electron`
- Motion Canvas 编排思想:https://motion-canvas.io/docs/flow 、time-events 、signals(作为方向 6 参考,不引入其代码)
- Manim 分段与缓存思想:https://docs.manim.community/(`next_section` / partial movie,作为方向 9、10 参考)
- Rive mix 权重与状态机:https://rive.app/docs/(方向 7 参考,不引入私有格式)
- Lottie 工具链:`LottieFiles/lottie-js`、`LottieFiles/dotlottie-js`、`dotlottie-web`(方向 8)
- NLE 时间线工程:Shotcut `src/models/multitrackmodel.h`、Kdenlive `src/timeline2/model/snapmodel`(方向 5 参考)

---

## 六、变更记录

- 2026-08-10:创建本文档。基于对 Remotion / Motion Canvas / Manim / Motionity / Rive / Lottie / Shotcut / Kdenlive / Blender VSE / OpenToonz 的开源调研整理(调研报告摘要见会话记录,本文档即其落地版)。
- 2026-08-10:**全部十个方向已实施完成**。里程碑 A(方向 1-2)、B(方向 3-4)、C(方向 5-6)、D(方向 7-9)、E(方向 10)全部落地,`pnpm check` 全绿(20 个测试文件 / 55 项测试),真实渲染冒烟(`test:exports`)通过。
  - 各方向「已实施/结论」见上文;实施中发现并记录的事实修正:openBrowser 复用与 premountFor 在 4.0.507 公开 API 不可用、media-utils 不适用、transitions 不适配、低配预览不可降帧率。
  - 明确暂缓项:方向 6 模板组件消费时间槽、方向 8 dotLottie 容器与回放预览、方向 9 多文件分段导出、方向 10 静止段缓存——均需后续独立任务。
- 2026-08-10:修复实施中发现的冒烟渲染回归——`render-worker.ts` 访问 `message.project.segments` 未容错(老项目/外部调用可能缺字段),现为 `?? []` 容错。
- 2026-08-11:完成方向 9 后续项——多文件分段导出、逐段真实媒体校验、`sections.json` 单测/真实渲染/打包 E2E 兜底,以及时间线分段点拖拽调整。
- 2026-08-11:完成 UI 阶段三实测问题修订——模板播放控制单一化、动画模组底色/透明度、1K/2K/4K + 横竖屏、自定义输出尺寸、紧凑数值控件、基础/动效检查器、拖放式动效库、统一时间线和可自定义快捷键。项目模型仅新增向后兼容的可选 `templateAppearance`;`pnpm check` 26 文件/75 测试、真实导出、打包应用 E2E 与 DMG 校验全部通过。
- 2026-08-11:完成 UI 阶段三实测问题修订（二）——8 秒静默恢复与仅 dirty 时退出询问、全应用统一 Portal 下拉、纯数字输入、紧凑变换布局、模板每次点击强制演示、时间线素材条直接选中及重复运输控件清理；未修改项目文件结构、模板 Schema、动画计算或导出逻辑。
