# 内置资源接入设计文档（第一批 · 修订版）

> 状态：**设计稿，未实施**（不修改产品代码）
> 范围：`Vincentwei1021/video-shotcraft`（Apache-2.0）第一批 8 张镜头卡 → **12 个 Motioner 模板**
> 版本：v2（含用户三项决策：转场拆独立模板 / 打字机拆两模板 / 转场采用纯遮罩形态）
> 日期：2026-08-12

## 1. 背景与目标

Motioner 现有 22 个模板，缺转场与花式排版两类形态。本批从 `video-shotcraft`（4.7k★，Apache-2.0）移植 8 张镜头卡，产出 12 个参数化模板，并验证"外部 Remotion 组件 → Motioner 模板"的完整移植流程。

## 2. 范围（决策后）

| 来源镜头卡 | 产出模板（id） | 数量 |
|---|---|---|
| `wipe-transitions`（BlindsSlice / ClockWipe） | `transition-wipe-blinds`、`transition-wipe-clock` | 2 |
| `circle-match-iris` | `transition-iris` | 1 |
| `print-texture-transitions` | `transition-ink` | 1 |
| `tear-streak-transitions` | `transition-glitch` | 1 |
| `gradient-transition`（linear/radial/conic 三层） | `transition-gradient-linear`、`transition-gradient-radial`、`transition-gradient-conic` | 3 |
| `typewriter-moves`（TerminalTypewriter / TypewriterErrorRetype） | `typewriter-terminal`、`typewriter-retype` | 2 |
| `scramble` | `text-scramble` | 1 |
| `split-flap-title` | `split-flap` | 1 |

合计 **12 个模板**：转场 8 个（分类 `transition`）+ 排版 4 个（分类 `subtitle`）。

### 源码事实（已逐文件核对，与 v1 一致）

- 8 张卡全部为**零 props** 组件，文本/几何/帧号全部为文件内 const 常量。
- 仅依赖 `react` + `remotion` 核心，**无第三方 npm 包、无音频、无字体加载、无 `_textures/` 素材**。
- 动画全部帧驱动、确定性（伪随机为 `sin` 哈希）。
- 仅 `gradient-transition`（180f）、`scramble`（96f）导出 `_DURATION`；其余时长隐含在帧号注释（130–160f @30fps）。

## 3. 产品形态：转场 = 纯 alpha 遮罩

**本批转场模板不渲染"素材 A→素材 B"画面，而是输出一张黑白 alpha 遮罩视频**：

- 白色区域 → alpha 不透明（= 剪辑时间线上将显示新画面 B 的区域）
- 黑色区域 → alpha 透明（= 露出下层轨道，即旧画面 A）
- 过渡边缘 → 半透明渐变（= 软边转场）

**用户用法**（写入用户手册）：把遮罩视频导出后，在剪辑软件中置于 B 素材上方轨道，对 B 素材应用**轨道遮罩键（Track Matte Key / Luma Matte）**，遮罩类型选 **Alpha**——遮罩白处 B 素材可见，黑处透出下层 A 素材，即得到无缝转场。该用法与 Motioner"导出透明视频叠时间线"的产品定位一致，且不占用素材槽，模板更轻量。

## 4. 通用移植策略（12 卡统一执行）

1. **参数化改造（零 props → zod schema）**：硬编码常量提升为 schema 字段。文字、方向、数量进 schema；源码中与占位素材耦合的几何常量（如 iris 的 `CX=308`）改为布局参数或归一化。
2. **遮罩化改造（仅转场 8 卡）**：源码的 A/B 占位景（`_fixtures/Fixtures.tsx` 的 `FakeDashboard`）**不搬运、不使用媒体槽**。效果层（clip-path 扇形、圆半径、竖条、墨渍 mask、渐变边界）重构为**单色 alpha 输出**：新画面区域涂白（`rgba(255,255,255,1)`）、旧画面区域涂黑（`rgba(0,0,0,0)`）、过渡边带用源码自带的渐变/扰动产生半透明。等效于把源码"B 景画布"整体替换为"白"，"A 景画布"替换为"透明"。
3. **坐标系统一**：弃用 1920×1080 硬编码与 `DesignStage`（480×270）双坐标系，统一走 Motioner `useCanvasUnit()`（按短边缩放）与 `SafeArea`/`AlphaSurface` 原语。
4. **时长模型**：全部 `durationMode: "fixed-edges"`（入场 = 遮罩/动效完成，之后持有最终画面）。用 `getFixedEdgesTimeline()`，禁组件内计时器。
5. **动效逻辑保留**：`interpolate` + `Easing` 曲线、帧号分段、`clip-path`/`mask`/`feTurbulence`/`feDisplacementMap` 结构原样保留；不引入 `spring()`、`@remotion/motion-blur`。
6. **fixture 不整体搬运**：`_fixtures/Motion.tsx`（`E`/`lerp`/`seg`/`rand`/`useT`）与 `Fixtures.tsx`（`G`/`FakeDashboard`/`TitleBlock`）不复制入库；确需的最小函数（如 `rand` sin 哈希）以 Apache 声明形式内联。目标产物仅依赖 `src/remotion/primitives.tsx` + 组件本体。

## 5. UI 改动

- `src/renderer/src/TemplateLibrary.tsx`：`CategoryFilter` 增加 `"transition"`，`categoryLabels` 增加 `transition: "转场"`（按钮位于 `subtitle` 与 `media` 之间）。
- 转场模板的**预览卡与描述文案**需说明"转场遮罩"用途（半白半黑静帧易误解），并随版本在用户手册 `docs/USER_GUIDE.md` 增加"转场遮罩用法"小节。
- `ComponentLibrary.tsx`（Composer 组件分类）本批不动。

## 6. 逐模板设计

### 6.1 转场遮罩 8 个（分类 `transition`）

共同 schema（遮罩模板无需媒体槽、无需配色预设）：

```
edgeSoftness: z.number().min(0).max(100)  过渡软边（默认 8%）
```

`durationMode: "fixed-edges"`，`alpha: true`（核心能力），`mediaSlots: 0`，`minDurationFrames: 90`，`maxDurationFrames: 18_000`，支持全部画幅。`preview.accent` 用白色。

| id | 名称 | 效果参数（schema） | 移植要点 |
|---|---|---|---|
| `transition-wipe-blinds` | 百叶窗遮罩 | `stripCount: z.number().int().min(4).max(48)` 默认 12；`direction: "vertical"\|"horizontal"` 默认 vertical | `BlindsSlice` 的 12 根竖条 scaleX 翻转重构为白条宽 0→全屏扩张；`direction` 需补充横向实现（源码仅竖向） |
| `transition-wipe-clock` | 时钟擦除遮罩 | `startAngle: z.number().min(0).max(360)` 默认 0（起点，12 点方向） | `ClockWipe` 72 顶点扇形 clip-path 保留，白扇形顺时针扫满；亮线层改为半透明白描边 |
| `transition-iris` | 圆形光圈遮罩 | `centerX/centerY: z.number().min(0).max(100)` 默认 50/50 | 半径 22→2100 + `Easing.inOut(cubic)` 保留；圆心改百分比；描边 sweep 保留 |
| `transition-ink` | 墨水洇染遮罩 | `seed: z.number().int().min(0).max(9999)` 默认 7 | `feTurbulence` + `feDisplacementMap`（scale 60→160）保留，墨渍白区扩张；4K 导出性能需验证 |
| `transition-glitch` | 撕裂故障遮罩 | `barCount: z.number().int().min(4).max(64)` 默认 16；`intensity: z.number().min(0).max(2)` 默认 1 | 横条确定性伪随机位移 + 明暗重影重构为"白条分块扩张 + 亮度/反相错位"；**遮罩版需重构**（源码是画面错位而非区域扩张），保留位移+重影视觉语言 |
| `transition-gradient-linear` | 线性渐变遮罩 | `angle: z.number().min(0).max(360)` 默认 45 | linear 渐变边界扫描，`lerp`/`seg`/`useT` 映射 Motioner 分段原语 |
| `transition-gradient-radial` | 径向渐变遮罩 | — | 白圆软边扩张（与 iris 视觉重叠，靠 `edgeSoftness` 区分：本模板恒有渐变软边） |
| `transition-gradient-conic` | 锥形渐变遮罩 | `startAngle: z.number().min(0).max(360)` 默认 0 | 白扇形软边旋转扫描 |

> 注：`iris` 与 `gradient-radial` 视觉相近，拆独立模板后靠软边参数区分；若实际使用中重叠明显，可在后续批次合并并保留兼容迁移。

### 6.2 排版 4 个（分类 `subtitle`）

`durationMode: "fixed-edges"`，`alpha: true`（透明背景可叠时间线），`mediaSlots: 0`。

| id | 名称 | schema | 移植要点 |
|---|---|---|---|
| `typewriter-terminal` | 终端打字机 | `text`(≤120)、`fontSize`(16–300, 默认56)、`color`(默认 #F4F7FB)、`accentColor`(默认 #47A7FF) | 打字节奏（`Math.floor((frame-start)/2)` substring）、光标 12f 方波、回车 scale 1→3.2（`Easing.in(cubic)`）回稳（`Easing.out(cubic)`）、末 2f `blur(0→10px)` 全部保留；终端窗几何 1100×620 改 canvas 相对、居中；**背景 FakeDashboard 弃用**（改透明或主题深色底，配 `bgOpacity` 参数可选） |
| `typewriter-retype` | 打字机纠错 | `text`(≤120)、`fontSize`、`color`、`accentColor` | 三档节奏（2f/字打、1.5f/字删、1.5f/字重打）纯帧数学保留；光标多段闪烁保留 |
| `text-scramble` | 乱码解码标题 | `text`(≤60)、`fontSize`(默认96)、`color`、`accentColor`(锁定辉光)、`fontFamily: "mono"\|"sans"` 默认 mono | `rand` sin 哈希跳字、`seg` 锁定、textShadow 辉光保留；`DesignStage` → `useCanvasUnit`；`minDurationFrames: 60` |
| `split-flap` | 翻页板标题 | `text`(≤40)、`cellColor`(默认 #1B2028)、`inkColor`(默认 #F4F7FB)、`accentColor`(翻页高光) | `Half`（上/下半 overflow hidden）+ `FlapCell`（`rotateX` 3D 翻叶、`Easing.in(quad)` 重力 + `Easing.out(quad)` 6px 咔哒回弹）、`perspective: 420`、伪随机 3 乱码中间态全部保留；`CELL_W=118` 改 canvas 相对并自适应字号；背景压暗层弃用（改透明） |

## 7. 合规要求（Apache-2.0）

- 每个移植组件文件头加：`Adapted from Vincentwei1021/video-shotcraft (c) 2026, Apache License 2.0 — https://github.com/Vincentwei1021/video-shotcraft`。
- `docs/THIRD_PARTY_NOTICES.md` 新增"video-shotcraft 内置组件"小节：来源、许可证（Apache-2.0）、12 个模板清单、改动说明（参数化 + 遮罩化 + 坐标系迁移）。
- 不搬运 `_fixtures/` 文件本身；内联极小函数随组件携带声明。

## 8. 验证计划

每个模板按 TEMPLATE_DEVELOPMENT.md 第 8 节门槛：

1. `pnpm template:new` 脚手架 + 手改 schema/组件 → catalog/definitions 双注册。
2. 单元测试：默认值通过 schema、字段 key 与 defaultProps 对齐。
3. 视觉关键帧：
   - 转场遮罩：0%（全透明）→ 遮罩中（黑白+软边）→ 持有段（全白不透明）→ 尾帧像素级静止；**重点验证 alpha 通道**（PNG RGBA 静帧人工核对白=不透明、黑=透明、边缘半透明）。
   - 排版：文字完整、乱码确定性（同帧两次渲染一致）、尾帧静止。
4. `pnpm check` 全绿；`visual:keyframes` 出静帧人工核对。
5. `test:exports` 覆盖 ProRes 4444 / PNG RGBA；`transition-ink` 额外跑 4K 导出计时。
6. 全量发布门槛：`remotion:bundle` / `visual:aspects` / `visual:composer` / `test:production`。

## 9. 实施顺序与工作量（约 2 人日）

| 步骤 | 内容 | 预计 |
|---|---|---|
| 1 | 脚手架建 12 个模板骨架 + `transition` 分类枚举 + 卡片预览文案 | 1h |
| 2 | 排版 4 个（低风险，无遮罩化改造）过视觉回归 | 2–3h |
| 3 | 转场遮罩 5 个简单卡（blinds/clock/iris/gradient×3） | 3–4h |
| 4 | 转场遮罩 2 个复杂卡（ink 的 feTurbulence、glitch 遮罩重构） | 2h |
| 5 | THIRD_PARTY_NOTICES 登记 + 用户手册转场遮罩用法 + 全量验证 | 1–2h |

风险集中：`transition-glitch` 遮罩重构（源码为画面错位，需设计块状扩张语义）、`transition-ink` 4K 性能。降级：glitch 第一版可退化为"横向百叶窗分块扩张"；ink 可退化纯 SVG mask 无扰动。

## 10. 已确认决策（v2 修订记录）

1. ~~wipe/gradient 合并 variant~~ → **拆成独立模板**（8 转场 + 4 排版 = 12）。
2. ~~typewriter 合一~~ → **拆 terminal / retype 两模板**。
3. ~~A/B 双素材槽~~ → **纯 alpha 转场遮罩**（无媒体槽，剪辑软件轨道遮罩用法）。
