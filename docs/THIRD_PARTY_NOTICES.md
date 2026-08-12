# Motioner 第三方依赖与许可说明

本文件是工程清单，不构成法律意见。Motioner 采用 MIT License 开源（见仓库根目录 `LICENSE`）。第三方组件继续受各自许可证约束；升级或公开分发前应重新核对原始许可证文本。

核对日期：2026-08-10。

## Remotion

Motioner 锁定 Remotion `4.0.507`，使用 Player、Renderer、CLI、Zod types 与 macOS compositor。Remotion 采用其自己的许可证条款，不应把它简单标为 MIT。

Remotion 官方当前说明：个人和最多 3 人的团队可使用免费许可，允许商业用途；团队增长或使用场景变化时必须按当时条款升级。Motioner 当前是单人、本地、自用工具，符合此次核对时的免费层描述。官方页面：https://www.remotion.dev/

注意：仓库公开开源后，使用场景可能被重新评估（例如向他人提供模板），请在公开分发前重新核对 Remotion 免费层条款。

在以下任一情况发生前必须重新检查 Remotion `LICENSE.md`、License FAQ 与定价页：

- Motioner 提供给公司或团队使用。
- 团队达到 4 人或以上。
- 变成面向他人的自动化视频服务、SaaS 或模板产品。
- 升级 Remotion 版本。

界面中的 `acknowledgeRemotionLicense` 只表示开发者已经完成此项人工核对，不会改变许可证义务。

## FFmpeg / FFprobe

FFmpeg 与 FFprobe 由 Remotion macOS compositor 包随应用携带。FFmpeg 的许可取决于实际构建配置和启用库，通常为 LGPL 2.1+，启用某些 GPL 组件时可能适用 GPL；不能仅凭可执行文件名推断。

Motioner 开源后属于公开分发场景，发布者必须在目标二进制上执行 `ffmpeg -version`，保存完整 configure flags，判断 LGPL/GPL 状态，并按适用许可证提供 notices、许可证副本和可替换/可重链接所需材料。参考：https://ffmpeg.org/legal.html

## Electron 与 Chromium

Electron 本身采用 MIT License，并包含 Chromium、Node.js 及其他各自授权组件。公开分发时保留 Electron 包中生成的 `LICENSES.chromium.html`、`LICENSE.electron.txt` 与应用 About/Notices 入口。参考：https://github.com/electron/electron/blob/main/LICENSE

## React、Zod 与工具链

- React / React DOM：MIT License。
- Zod：MIT License。
- Vite、Vitest、TypeScript、ESLint、Prettier、electron-vite、electron-builder：仅用于开发或打包，分别受上游许可证约束。
- `@remotion/*` 包：遵循 Remotion 上游许可证，不按普通 MIT 依赖处理。

精确版本以根目录 `package.json` 与 `pnpm-lock.yaml` 为准。`pnpm install --frozen-lockfile` 用于防止构建时静默漂移版本。

## 内置动效组件（video-shotcraft）

Motioner 1.4 起内置来自 [Vincentwei1021/video-shotcraft](https://github.com/Vincentwei1021/video-shotcraft)（Apache License 2.0）的组件：24 个模板（8 个转场遮罩、4 个花式排版、12 个数据/资料/字幕/效果模板）与 5 个自由编排组件（列表逐项、卡片堆叠、骨架屏、SVG描边、里程表数字）。

所有内置组件均已完成参数化与坐标系适配（详见 `docs/TEMPLATE_INGESTION_PLAN.md`），每个组件文件头保留上游 Apache 版权声明。上游许可证文本：https://www.apache.org/licenses/LICENSE-2.0

## 内置 Lottie 动效

Motioner 1.4 起内置 7 个自产 Lottie 动效（加载圆环、加载三点、声波扩散、成功勾选、点赞心形、播放按钮、右向箭头），均为程序化生成的确定性几何动画，随 MIT 开源项目分发，无第三方署名义务。渲染依赖 `@remotion/lottie` 与 `lottie-web`（lottie-web 为 MIT License，@remotion/lottie 遵循 Remotion 上游许可证，见上文 Remotion 一节）。

## 图片展示预设

Motioner 1.5 起新增 10 个图片展示模板（九宫格拼贴、瀑布流、卡片横流、3D 轮播、聚光强调、动态相框、档案堆叠、书封墙、文献卡片、老照片相册）。其中：

- 瀑布流与卡片横流使用 [react-photo-album](https://github.com/igordanchenko/react-photo-album)（MIT License）的布局纯函数。
- 3D 轮播与聚光强调移植自 video-shotcraft（Apache-2.0，见上节）。
- 档案堆叠、书封墙、文献卡片、动态相框的形态概念参考 Codrops 系列演示，代码为自写实现（不复制上游代码）。

## 项目素材与字体

Motioner 不内置第三方商业字体、图库、音乐或演示视频。模板使用 macOS 系统字体栈和程序生成的 SVG/形状。用户导入素材的版权与使用授权由用户自行负责；“收集素材”只复制文件，不授予新权利。
