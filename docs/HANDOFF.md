# Motioner 交接文档(Handoff)

> 本文档供后续开发会话(Codex / Reasonix 或人工)接手时阅读。
> 记录:接手背景、已完成工作、当前状态、待办事项与已知注意事项。
> 配套文档:`docs/IMPROVEMENT_ROADMAP.md`(十方向实施路线,含各方向"已实施/结论"明细)。

---

## 一、交接背景

- 项目:Motioner —— 仅面向 Apple Silicon macOS 的本地透明动效生成器(Electron + React + Remotion 4.0.507 + pnpm 11 monorepo)。
- 交接起点:Codex 因额度用完暂停时,已完成 v1.3.1 的功能重构(`pnpm check` 47 项测试通过),但**新 DMG 未生成**(打包依赖目录需重建,Codex 侧权限被拒)。
- 本会话接手后:恢复依赖 → 打包交付 → 修复用户反馈的交互问题 → 完成十方向改进路线图 → 多轮打包验证。**当前工作区干净,全部改动已提交。**

---

## 二、接手后完成的工作(按时间顺序)

### 1. 依赖恢复与首次打包交付
- 运行 `pnpm install --frozen-lockfile`(pnpm 位于 codex runtime:`/Users/monarch/.cache/codex-runtimes/codex-primary-runtime/dependencies/bin/fallback/pnpm`,需加入 PATH)。
- 完成 `pnpm package:dmg` 全流程:check(19 文件/47 测试)+ remotion bundle + electron-vite build + electron-builder DMG + `verify-package` + `package-e2e`,交付 `release/Motioner-1.3.1-arm64.dmg`。

### 2. 用户反馈的两处交互修复(已并入 `d5d8356`)
- **空格键被按钮激活劫持**:焦点停在动效/素材按钮上按空格会触发按钮 click(选择/取消)而非播放。修复:仅放行 `input/textarea/contenteditable` 内空格,其余一律 `preventDefault` + 播放/暂停。
- **选中状态残留**:新增 document 级「点击清除选中」监听(composer 模式,捕获阶段),点击不在保留区(画布节点区/时间线行/组件库/检查器)的任何区域即清空 `selectedNodeId`。
- **竖屏预览异常巨大**:`.player-frame` 原按 `min(100%, 960px)` 宽度 + aspect-ratio 推导高度,竖屏超高溢出遮挡 UI。改为 `.stage-wrap` 声明 `container-type: size`,player-frame 用 `100cqw/100cqh` 双向 contain(横竖屏恒定在预览区域内等比展示),`previewZoom` 作为整体缩放系数。

### 3. 十方向改进路线图(提交 `15581ac`,明细见 `docs/IMPROVEMENT_ROADMAP.md`)
| 里程碑 | 方向 | 落地内容 |
|---|---|---|
| A 工程加固 | 1 发布架构 | `after-pack.cjs` 打包期校验 compositor;调研结论:openBrowser 复用在 4.0.507 公开 API 不可用 |
| | 2 渲染可靠性 | `offthreadVideoCacheSizeInBytes` 512MB;渲染失败自动重试一次(用户错误除外) |
| B 媒体与编排 | 3 官方工具链 | 引入 `@remotion/media/animation-utils/media-utils`;`MediaSlot` 视频改用官方 `<Video>` |
| | 4 Sequence/转场 | 确认已用 `<Sequence>`;premountFor/transitions 结论记录(不适用) |
| C 编辑体验 | 5 时间线交互 | 吸附(snapFrame+Alt 禁用)、Shift 多选、波纹删除、干跑校验 |
| | 6 时间槽 | 项目级 `TimeSlot`,时间线可拖拽标记(＋标记) |
| D 动效与输出 | 7 mix 权重 | `motion.mix` 三通道权重(0-1),检查器三通道滑杆 |
| | 8 Lottie 导出 | `lottie-export.ts` 序列化器 + `lottie-json` 预设 + 渲染管线分支 |
| | 9 分段元数据 | 分段点(＋分段)+ 导出 `sections.json` |
| E 性能 | 10 低配预览 | 「低配预览」按钮(分辨率减半,帧率保持) |

### 4. 打包脚本修复(提交 `5e7a133`)
- `after-pack.cjs` 的 compositor 校验误用 `context.arch === "arm64"`(electron-builder 的 `context.arch` 是**数字枚举**),恒 false 导致误查 x64 路径而打包失败;改为 `process.arch`。

### 5. 删除反馈与分辨率输入体验(提交 `58c42d1`)
- **画布空态提示**:Composer 图层全删后显示「画布没有图层,从左侧组件库添加…」,删除有明确反馈。
- **键盘 Delete/Backspace 删除**选中图层(输入框内除外)。
- **分辨率输入重构**:新增 `DimensionInput`(宽度 × 高度 + ⇄ 切换横竖屏),草稿输入、**blur/回车才应用**(不再每敲一个数字就触发一次画布变化);顶栏快捷分辨率同步替换;输出规格保留画布预设下拉。
- 新增 `composer-delete-flow` 集成测试(默认模板节点删除/添加后不复活)。

### 6. 时间线素材无法删除的竞态修复(提交 `defc794`)
- **根因**:「点击清除选中」的 document 捕获监听把时间线操作按钮(删除/复制/置顶/波纹删除)也判为"无关区域",点击删除按钮时**先清空 `selectedNodeId`**,与按钮 onClick 产生竞态,导致删除失效(所有素材都删不掉)。
- **修复**:`.composer-timeline .timeline-toolbar` 纳入保留选中区域;键盘删除改用 ref 持有处理器。

### 7. 界面按钮 lucide 图标化(提交 `fd86c51`)
- 引入 MIT 开源 `lucide-react`,将全部可图标化的文字/符号按钮替换为统一图标(28 个纯图标 + 8 个符号规范化),保留 `title`/`aria-label` 兜底可访问性。
- 高信息量按钮(导出/模式切换/入场退场循环/波纹删除/工作流)保留文字。新增 `.icon-btn` 统一样式。
- `pnpm check` 21 文件/57 测试全绿,打包 + verify + e2e + hdiutil + 挂载内容验证全部通过。

### 8. 方向 9 多文件分段导出 + 分段点拖拽(2026-08-11)
- 输出规格新增「分段导出」开关(仅视频格式且存在分段点时可用)。开启后输出独立文件夹,按段生成 `01-段-1.*`、`02-段-2.*` 等视频,并附带 `sections.json` 与 `motioner-export-report.json`。
- 每段使用 Remotion `frameRange` 独立渲染,逐段写入 Rec.709 元数据并执行 FFprobe 帧数/编码/尺寸/帧率/色彩校验及 FFmpeg 解码校验;所有产物完成后原子提升整个目录。未开启时保留原整片导出与 sidecar 行为。
- `sections.json` 每段写入实际 `codec_name/width/height/avg_frame_rate/duration/nb_frames/fileSizeBytes` 与时间线边界;新增段边界/文件名/清单字段单测。
- 时间线橙色分段点可拖拽调整,Alt 临时取消吸附;限制在首末帧之间并拒绝重合。缩短项目时长会同步收拢/去重分段点。
- 验证:`pnpm check` 22 文件/61 测试;`test:exports` 实际导出 3 段 H.264;`package:dmg` 内的打包应用 E2E 实际导出 3 段/75 帧并核验清单;`hdiutil verify` 通过。

### 9. UI 重构阶段一：布局架构优化(2026-08-11)
- 新增 `docs/当前UI架构分析.md`,梳理 Renderer 入口、两种模式组件、状态/样式管理、时间线、检查器和施工风险。
- 顶部模式切换提升到品牌后的全局导航位,改为常驻胶囊 Tab 和明确当前态;品牌副标题同步标识「快速制作 / 专业制作」。
- 三栏改为受约束比例布局:1440px 窗口实测 288/792/360px(20%/55%/25%),1280px 最小窗口实测 256/704/320px,无页面横向溢出。
- 模板时间线固定 54px,Composer 时间线固定 236px;画布工具栏单行稳定,控制项过多时仅在局部滚动;检查器标题固定、内容独立滚动。
- 新增 `docs/阶段一完成报告.md` 与两种模式 1440×900 截图。阶段二/三未开始,等待用户确认。
- 验证:`pnpm check` 22 文件/61 测试;`test:exports` 五类真实输出全通过;`package:dmg` + 包内完整性 + 打包应用 3 段 E2E + `hdiutil verify` 全通过。

### 10. UI 重构阶段二：视觉系统优化(2026-08-11)
- 按设计计划建立精确视觉 token:背景 `#111418`、面板 `#171B22`、边框 `#252B35`、强调 `#409EFF`,补充表面/文字/语义色与统一圆角、状态过渡。
- 模板库保持两列卡片,每张卡片明确展示缩略图、名称、类型与最低时长;卡片/组件/动效使用克制边框和表面层级,不使用装饰性阴影。
- 新增复用 `InspectorGroup`,模板 manifest 字段、Composer 节点属性和 App 项目级设置全部改为可折叠分组;默认只展开高频内容/图层/变换,点击分组不会触发节点取消选中竞态。
- 渲染队列浮层移除大阴影;进度条由 `width` 动画改为合成层 `scale` 动画。Impeccable UI 反模式检测为 0 项。
- 新增 `docs/阶段二完成报告.md` 与两种模式 1440×900 截图。阶段三未开始,等待用户确认。
- 验证:`pnpm check` 22 文件/61 测试;1440×900 与 1280×760 无页面横向溢出;文字/强调色对比度全部达到 WCAG AA;`test:exports`、`package:dmg`、包内完整性、打包应用 3 段 E2E 与 `hdiutil verify` 全通过。

### 11. UI 重构阶段三：交互效率与稳定布局(2026-08-11)
- 模板检查器拆为「快速编辑 / 导出设置」任务 Tab;默认只显示 manifest 用户字段,字体/全局动画/预设/批量/输出等低频项目项收纳到导出设置。右侧底部固定预览与导出动作。
- 模板简化时间线增加播放/暂停、从头播放、可拖播放头、时码和帧数,画布工具栏明确「快速预览」。
- 组件卡片支持点击创建或拖入画布按落点创建,拖入时显示十字落点;新增边界约束 helper 与单测。
- Composer 时间线新增可拖动效关键点,直接编辑既有 `enterDuration/exitDuration`;真实界面从 15 帧拖到 45 帧验证通过。右侧底部固定当前图层摘要、复制和删除。
- 检查器改为固定头部 + 独立滚动 + 56px 固定动作区;长标题替换前后画布/按钮坐标不变。1280×760 实测 256/704/320px、页面 X/Y 溢出为 0、时间线固定 236px。
- 新增 `docs/阶段三完成报告.md` 与两种模式 1440×900 截图。未新增任意属性关键帧模型,未修改项目/模板/导出/动画契约。
- 验证:`pnpm check` 23 文件/64 测试;Impeccable 检测 0 项;`test:exports` 五类真实输出、`package:dmg`、包内完整性、打包应用 3 段 E2E 与 `hdiutil verify` 全通过。

### 12. UI 阶段三实测问题修订(2026-08-11)
- 模板播放控制单一化:移除画面内原生播放按钮/进度条和模板循环,仅保留下方简化时间线;点击模板预览区域从首帧播放一次。
- 新增项目级可选 `templateAppearance`(底色、透明度、自动深浅前景),提供原始/透明/深浅色预设、自定义 HEX、最近颜色和不透明度。旧项目自动补默认值;模组外围透明不变,预览与真实导出同源。
- 顶栏输出改为 1K/2K/4K + 横竖屏预设;导出设置才显示自定义宽高。实机验收中修复了“选择自定义后立即回到 1K”的局部状态问题。
- 新增紧凑滑块 + 数字输入控件,覆盖模板连续数值、时长、图层变换/时间和动效帧数/强度;自由编排右侧拆为「基础设置 / 动效设置」,模板快照后置。
- 动效库移除勾选框、阶段按钮和点击应用,改为拖到画布组件/时间线图层;左侧使用 Lucide 动效图标避免勾选框视觉歧义,右侧按入场/持续/退场分组编辑。
- 时间线运输、标记、分段、图层顺序、波纹删除和普通删除统一为 30px Lucide 图标,按桌面剪辑工作流分组。
- 新增集中快捷键系统与设置面板:命令搜索、录入、冲突拦截、清除、单项/全部重置;用户映射保存在 `localStorage`,不写项目。实机验证方向键逐帧与 Command+方向键首尾跳转。
- 新增 `docs/UI_UX_REFINEMENT_EXECUTION_PLAN.md`、5 张实测修订截图及对应完成报告补充。
- 验证:`pnpm check` 26 文件/75 测试;`test:exports` 两种 ProRes、PNG RGBA、H.264 整片和三分段全通过;`package:dmg`、8 项包内完整性、打包应用 H.264 三段/75 帧 E2E、`hdiutil verify` 全通过。

### 13. UI 阶段三实测问题修订（二）(2026-08-11)
- 保存生命周期改为 8 秒防抖的静默恢复快照：成功不再刷提示、不覆盖项目文件、不清除 dirty；仅有未保存修改时退出才弹出“保存并退出 / 不保存 / 取消”，保存取消或失败会中止退出。
- 新增全应用统一 `Select/Listbox`：全部原生 `<select>` 已替换为同一套 Portal + fixed 菜单，固定从触发器下方展开，不挤压顶栏/画布；支持方向键、Home/End、Enter/Space、Escape、Tab、外部点击关闭，当前项同时显示勾选和高亮。
- 数字输入框完全移除内嵌 `%`、`°`、`×` 等单位，语义转移到行标签；变换区按位置双轴、尺寸双轴+链接锁、旋转、透明度紧凑对齐，不透明度只保留一个行内重置按钮。
- 除输入框、文本域和可编辑内容外，全界面禁止文本选择，避免按钮与说明文字出现网页式选中效果。
- 模板卡片无论当前播放状态、是否重复点击当前模板，都会在状态提交后从第 0 帧强制播放一次；卡片收藏等次级操作不触发播放。
- 时间线素材条、轨道、裁剪柄和动效关键点交互均先选中图层；时间线根节点 pointer capture 会重定向后续 click，因此全时间线被纳入全局选中保留区。画布顶部移除重复运输控制，只保留视图、性能、场景动作和状态，下方时间线成为唯一完整运输区。
- 新增统一下拉键盘导航、模板选择动作和关闭决策单测；真实 Electron 中验证静默恢复、退出取消、下拉向下展开、模板强制播放、时间线拖动选中及变换面板对齐。`test:exports` 五类真实输出、打包应用三段 E2E、8 项离线完整性及 `hdiutil verify` 均通过。

---

## 三、当前项目状态

- **版本**:1.3.1(应用版本号未随功能递增;如需发版请先更新 `package.json` version 与 README)。
- **测试**:`pnpm check` 全绿 —— 29 个测试文件 / 82 项测试(lint + tsc + vitest)。
- **构建产物**:`release/Motioner-1.3.1-arm64.dmg`(274,252,227 bytes,约 261.5 MiB)+ `Motioner-integrity.json` + `SHA256SUMS.txt`;当前 DMG SHA256:`ad0cfb312340bc5f7a4b7d0b800dd96d3b63e386acc8b2e19a915e363e0daec4`。
- **Git**:方向 9、UI 重构阶段一/二/三及阶段三实测修订均已实现;`docs/CODEX_HANDOFF_PROMPT.md`、`docs/design-reference/`、`docs/ui-redesign-plan.md` 为本轮开始前已存在的未跟踪用户资料,未纳入提交。
- **新增依赖**:`@remotion/media`、`@remotion/media-utils`、`@remotion/animation-utils`(均 4.0.507)、`lucide-react`(1.30.0),均已入 `package.json` 与 lock。

---

## 四、待办 / 暂缓事项(按路线图约定)

1. **方向 6 模板消费时间槽**:让模板 schema 声明具名时刻并消费 `project.timeSlots`,需扩展 template-sdk 字段体系(新增「时间槽引用」控件类型)与模板运行时。当前时间槽数据已就绪。
2. **方向 8 dotLottie 容器与回放预览**:`dotlottie-js` 打包 `.lottie`、lottie-web 回放 UI;`lottie-js` 对象模型重构序列化器(当前手写 JSON)。
3. **方向 10 静止段缓存**:帧缓存正确性风险高,按约定「缓存默认关闭、仅显式开启」暂缓。
4. **Lottie 导出范围**:当前是可表达子集 POC(矩形/圆形/文字 + 基础动效),图片/视频/图表等图层会跳过并在导出报告提示;如需完整覆盖需扩展序列化器。
5. **electron-builder 下载超时**:本机到 GitHub 网络波动,`package:dmg` 偶发 `Timeout awaiting 'request' for 600000ms`,重试(命中缓存)即成功;若频繁出现可设 `ELECTRON_MIRROR="https://npmmirror.com/mirrors/electron/"`。

---

## 五、环境与命令速查

```bash
# pnpm 在 codex runtime,需先加 PATH
export PATH="/Users/monarch/.local/bin:/Users/monarch/.cache/codex-runtimes/codex-primary-runtime/dependencies/bin/fallback:$PATH"

pnpm check            # lint + typecheck + 当前全部单测(每次改动后必跑)
pnpm dev              # remotion bundle 后 electron-vite dev
pnpm test:exports     # 真实渲染冒烟(需先 remotion:bundle + electron-vite build;旧产物冲突时先 rm -rf output)
pnpm package:dmg      # 完整打包:build + electron-builder + verify + package-e2e
```

- `test:exports` 依赖 `dist/remotion`(serveUrl)与 `out/main/render-worker.js`;若提示「目标文件已存在」,先 `rm -rf output`。
- 打包后 `release/SHA256SUMS.txt` 中 1.3.1 行需用新 `shasum -a 256` 更新;`hdiutil verify` 校验 DMG。
- 打包中间产物(`out/ dist/ output/ release/mac-arm64/ *.blockmap` 等)可清理,`release/*.dmg`、`integrity.json`、`SHA256SUMS.txt` 保留。

---

## 六、已知注意事项(接手者必读)

1. **`vendor/chrome-headless-shell` 不入 git**(`.gitignore` 忽略),clone 后需外部准备;`getBinariesDirectory()` 打包态指向 `app.asar.unpacked/node_modules/@remotion/compositor-darwin-arm64`,`after-pack.cjs` 会在打包期校验其存在。
2. **项目为 pnpm workspace 根**:新增依赖需 `pnpm add -w`;打包配置(extraResources/asarUnpack)在根 `package.json` 的 `build` 字段。
3. **Remotion 4.0.507 的公开 API 限制**(实施中已确认):
   - `renderMedia/renderFrames/selectComposition` **不接受** `browser`/`puppeteerInstance` 参数(仅内部 API),每次渲染由 Remotion 自行启动浏览器。
   - `<Sequence>` 的 `premountFor` 公开 props 类型不存在(仅内部 no-react 类型)。
   - 帧驱动模型下**不可降低 Player 的 fps 做低配预览**(会改变动画时间语义);低配只降分辨率。
4. **点击清除选中机制**:`App.tsx` 的 document 捕获监听(composer 模式)会清除 `selectedNodeId`;保留区 = `.composer-canvas-overlay`、整个 `.composer-timeline`、`.component-library`、`.inspector-panel`。时间线必须整体保留，因为拖动素材条时根节点会接管 pointer capture，后续 click 的 target 可能被重定向到时间线根节点。**新增任何操作选中节点的按钮，若不在上述区域内，点击会先清空选中导致操作失效——务必同步加入保留区**。
5. **删除逻辑**:`App.tsx` 的 `deleteSelectedNodes(ripple)` 支持多选(`multiSelectedIds` 优先)与波纹删除;时间线工具栏「删除」「波纹删除」、键盘 Delete 均走此函数。
6. **分辨率输入**:`DimensionInput`(宽 × 高 + ⇄ 对调)在顶栏(compact)与输出规格(inspector)各一处;输入 blur/回车才提交,偶数化在组件内处理。
7. **暂缓项均有文档记录**,不要在未更新路线图文档的情况下擅自扩大范围。

---

## 七、对 Codex 接手的建议

- 优先从「第四部分:待办/暂缓事项」按序推进;每完成一项:更新 `docs/IMPROVEMENT_ROADMAP.md` 对应章节 → `pnpm check` → 相关真实渲染验证(`test:exports` / `package-e2e`)。
- 若改动涉及「操作选中节点的按钮/UI」,务必检查点击清除选中保留区(见第六节第 4 条)。
- 打包交付流程见 README「构建本机目录包和 DMG」;发布前确认 `after-pack.cjs` 的 compositor 校验通过。
- 用户偏好:界面反馈明确(删除/导出/错误均有文字提示)、分辨率输入失焦生效、动效与素材选择后可保持选中但点击无关区域即取消。

---

## 八、变更记录

- 2026-08-10:创建本文档。记录 Reasonix 接手 codex 之后(依赖恢复 → 打包交付 → 交互修复 → 十方向路线图 → 多轮打包与回归修复)的全部工作、当前状态与待办。
- 2026-08-10:追加记录——界面按钮 lucide 图标化(提交 `fd86c51`),新增 `lucide-react` 依赖;DMG 挂载内容验证纳入交付检查清单。
- 2026-08-11:完成方向 9 后续——多文件分段导出、分段点拖拽、逐段真实媒体校验、`sections.json` 单测与打包应用 E2E;重新交付 v1.3.1 DMG 并更新 SHA256。
- 2026-08-11:完成 UI 重构阶段一——常驻胶囊模式导航、稳定三栏比例、固定时间线、侧栏独立滚动、两模式截图与完成报告;重新打包 v1.3.1 DMG 并更新 SHA256。阶段二等待确认。
- 2026-08-11:完成 UI 重构阶段二——精确视觉 token、统一控件与卡片、模板卡片类型/时长、全检查器折叠分组、对比度和最小窗口验证;重新打包 v1.3.1 DMG 并更新 SHA256。阶段三等待确认。
- 2026-08-11:完成 UI 重构阶段三——模板快速编辑/预览/导出、组件拖入落点、可拖动效关键点、固定检查器动作区和长文本/最小窗口稳定性;重新打包 v1.3.1 DMG 并更新 SHA256。三阶段 UI 重构完成,等待最终验收。
- 2026-08-11:完成阶段三实测问题修订——模组底色/透明度、播放控制、分辨率逻辑、紧凑属性、拖放式动效库、统一时间线和可自定义快捷键;重新打包 v1.3.1 DMG,更新完整性清单与 SHA256,全部自动检查和真实导出验证通过。
- 2026-08-11:完成阶段三实测问题修订（二）——8 秒静默恢复与 dirty 退出询问、全应用统一下拉、纯数字输入与紧凑变换区、模板强制演示、时间线条选中和重复运输控件清理；实施范围与验收固定于 `docs/UI_UX_REFINEMENT_EXECUTION_PLAN_V2.md`。
