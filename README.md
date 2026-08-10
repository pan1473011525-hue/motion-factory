# Motioner

Motioner 是一款仅面向 Apple Silicon macOS 的本地透明动效生成器。既可以选择模板后填写文字、数据或素材，也可以从组件库自由搭建画面、安排图层时序和动效；最终生成可直接放入剪辑时间线的透明 ProRes 4444、ProRes 4444 XQ 或 PNG 序列，也可生成带深色底的 H.264 审看版。

当前版本：`1.3.1`。应用、Dock 与安装包已使用 Motioner 正式图标。

## 已交付能力

- 22 个生产模板；1.2 新增透明测试卡、路线地图、多折线、堆叠柱、新闻标题、体育比分、画面标注、素材轮播、前后对照和自适应分屏。
- 双工作流：保留模板快速生成，并新增自由编排画布；模板可一键冻结为可移动、缩放和定时的场景图层。
- 15 个基础组件：标题、正文、数据数字、矩形、圆形、分隔线、图片、视频、引语、标签、进度条、注释卡、人名条、迷你柱图和模板场景。
- 16 个帧驱动动效预设，覆盖入场、退场与持续动效；可点击阶段按钮勾选，也可拖到时间线素材条的左、中、右区域应用。
- 自由画布支持拖动、八向缩放、旋转/透明度参数、网格与磁吸、键盘微调；图层时间轴支持移动、修剪、点击寻帧和拖动预览轴。
- 18 个共享图形/动效原语；所有动画由当前帧纯函数计算，预览与导出使用同一组件。
- Schema 驱动检查器：文字、数字、颜色、开关、选项、数组表格和媒体槽。
- Numbers/Excel 粘贴、CSV 预览与列映射、命名规则、逐行校验和最多 100 行批量生成。
- 1920×1080、3840×2160、竖屏、方形和自定义偶数画布。
- 23.976、24、25、29.97、30、50、59.94、60 fps 分数帧率。
- 空格播放/暂停、显式播放按钮、点击或拖动时间线寻帧、逐帧、首末帧、时间码、安全区、棋盘格/黑/白/灰/截图底图和预览缩放。
- 顶栏可直接修改分辨率、帧率、时长与导出格式；右侧仍保留完整高级输出设置。
- 收藏、最近使用、三套样式皮肤、参数预设导入/导出、项目自定义字体、撤销/重做、自动保存和崩溃恢复。
- 本地素材收集、SHA-256 指纹、文件/文件夹批量重链、图片缩略图、视频代理、图像适配/焦点/缩放/圆角，以及视频入点/出点/倍速/持有/循环。
- 独立 Utility Process 顺序导出队列，允许继续编辑、取消、重试和重启后查看未完成记录。
- ProRes 4444、4444 XQ、PNG RGBA 序列、H.264 yuv420p 四种输出。
- 导出前空间估计和磁盘余量检查；临时文件完整渲染并验证后原子落盘。
- FFprobe 自动断言 codec、profile、像素格式、尺寸、分数帧率、总帧数、Rec.709 三项元数据和意外音轨；FFmpeg 完整解码到末帧。
- 输出重名可选自动版本号、安全替换或跳过；替换仅在新文件验证成功后执行。
- 内置模板脚手架 `pnpm template:new -- --id=<id> --name=<名称>`，自动生成 Manifest/组件并注册。
- 项目格式 v2 同时保存模板参数和 Composer 场景；v1 项目及恢复快照打开时自动迁移，不修改原有模板语义。
- 每次成功导出附带 `.motioner.json` 报告，界面显示实际文件大小并可在 Finder 中定位。
- 打包内置 Headless Chrome、FFmpeg、FFprobe 和 Remotion bundle，首次运行不下载渲染依赖。

## 快速开始

```bash
pnpm install
pnpm dev
```

质量检查与视觉回归：

```bash
pnpm check
pnpm visual:build-tool
pnpm visual:keyframes
pnpm visual:aspects
pnpm visual:composer
pnpm test:exports
pnpm test:cancel
pnpm test:production
```

构建本机目录包和 DMG：

```bash
pnpm package:mac
pnpm verify:package
pnpm package:dmg
```

输出位置：

- `release/mac-arm64/Motioner.app`
- `release/Motioner-1.3.1-arm64.dmg`
- `release/Motioner-integrity.json`

未签名构建仅供本机自用。公开分发前需要 Developer ID、Hardened Runtime 和 Notarization。

## 仓库结构

```text
packages/project-model/   项目、画布、分数帧率、动画设置
packages/template-sdk/    模板协议、迁移、时长模式和校验
src/main/                 Electron 生命周期、文件服务、队列、日志、渲染调度
src/preload/              contextBridge 白名单 API
src/renderer/             React 工作台和动态检查器
src/composer/             组件注册表、动效预设和自由编排 Remotion 运行时
src/remotion/             共享动效原语与模板组件
src/templates/            22 个 manifest、默认值和运行时注册
src/shared/               IPC 合同、导出预设和空间估算
scripts/                  视觉、导出、生产与包完整性测试
docs/                     使用、模板开发、架构和验收文档
```

## 文档

- [用户手册](docs/USER_GUIDE.md)
- [新增模板开发指南](docs/TEMPLATE_DEVELOPMENT.md)
- [架构与数据格式](docs/ARCHITECTURE.md)
- [最终验收报告](docs/ACCEPTANCE_REPORT.md)
- [更新记录](docs/CHANGELOG.md)
- [第三方依赖与许可证说明](docs/THIRD_PARTY_NOTICES.md)

Motioner 是个人本地工具，不包含账号、云渲染、模板商店、音频混合、完整非线性剪辑或任意脚本模板安装能力。
