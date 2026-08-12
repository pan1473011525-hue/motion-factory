# Codex 交接提示词(直接复制本文件内容粘贴给 Codex)

你是 Motioner 项目的接手开发者。Motioner 是一款仅面向 Apple Silicon macOS 的本地透明动效生成器:Electron 43 + React 19 + Remotion 4.0.507 + pnpm 11 monorepo,位于 `/Users/monarch/Documents/动效工厂/motion-factory`。上一阶段由 Reasonix 接手完成了一批工作,现在交给你继续。

## 第一步:先读这两份文档,掌握全部进展

1. `docs/HANDOFF.md` —— 完整的交接记录:接手背景、已完成工作(按时间序)、当前项目状态、待办/暂缓事项、接手必读注意事项、命令速查。
2. `docs/IMPROVEMENT_ROADMAP.md` —— 十方向改进路线图:每个方向都有「动机 / 已实施 / 结论 / 未做(后续) / 验收标准」明细,是后续工作的施工图纸。

## 项目当前状态(截至交接时刻)

- **版本**:1.3.1(`package.json` 与 DMG 内 app 一致);`release/Motioner-1.3.1-arm64.dmg`(261.5 MB)已交付,含 `SHA256SUMS.txt` 与 `Motioner-integrity.json`。
- **测试**:`pnpm check` = lint + tsc + vitest,**21 文件 / 57 项测试全绿**。
- **Git**:工作区干净。最近提交:`fd86c51 feat: 界面按钮统一替换为 lucide 图标`、`b42c228 docs: 交接文档同步`。
- **已完成的重要工作**(细节在 HANDOFF.md):
  - 交互修复:点击无关区域清除选中、空格键不被按钮劫持、竖屏预览恒定区域 contain 排布、删除竞态修复。
  - 十方向路线图全部主体落地:渲染可靠性(offthreadVideoCacheSizeInBytes/失败重试)、`@remotion/media` 视频组件、时间线吸附/多选/波纹删除/干跑、时间槽数据、动效 mix 权重、Lottie JSON 导出、分段点 + sections.json、低配预览等。
  - 界面全部可图标化按钮已统一替换为 lucide-react 图标(保留 title/aria-label)。

## 现在应该做什么(按此优先级推进)

**优先推进 HANDOFF.md 第四部分的待办项**,每完成一项的固定流程:更新 `docs/IMPROVEMENT_ROADMAP.md` 对应章节 → `pnpm check` → 真实渲染验证(`pnpm test:exports` 或 `package-e2e`)。

推荐顺序(按用户可见价值 × 风险权衡):

1. **方向 9:多文件分段导出 + 分段点拖拽**(价值最高、技术路径清晰):按分段输出多个视频文件(Remotion `frameRange` 多段渲染),时间线分段点可拖拽调整;`sections.json` 单测与 `package-e2e` 兜底。
2. **方向 8:dotLottie 容器打包 + lottie-web 回放预览**(锦上添花):用 `dotlottie-js` 打包 `.lottie`,导出面板加回放;`lottie-js` 对象模型重构序列化器可暂缓。
3. **方向 6:模板组件消费时间槽**(需扩展 template-sdk 字段体系,属契约变更,单独做、充分回归)。
4. **方向 10:静止段缓存**(正确性风险高,严格按「缓存默认关闭、仅显式开启」设计,优先写清楚失效策略)。

若你不确定某方向是否值得做,先回读路线图对应章节的「验收标准」,并与用户确认范围。

## 环境与命令速查

```bash
export PATH="/Users/monarch/.local/bin:/Users/monarch/.cache/codex-runtimes/codex-primary-runtime/dependencies/bin/fallback:$PATH"

pnpm check            # lint + typecheck + 57 项单测(每次改动后必跑)
pnpm dev              # remotion bundle 后 electron-vite dev
pnpm test:exports     # 真实渲染冒烟(需先 remotion:bundle + electron-vite build;提示目标文件已存在时先 rm -rf output)
pnpm package:dmg      # 完整打包:build + electron-builder + verify-package + package-e2e
```

打包注意事项:
- 打包后 `release/SHA256SUMS.txt` 的 1.3.1 行要用新 `shasum -a 256` 更新,并 `hdiutil verify` 校验 DMG。
- 中间产物(`out/ dist/ output/ release/mac-arm64/ *.blockmap` 等)可清理,`release/*.dmg`、`Motioner-integrity.json`、`SHA256SUMS.txt` 保留。
- electron-builder 下载 GitHub 二进制可能超时(报 `Timeout awaiting 'request'`),重试(命中缓存)即成功;频繁出现可设 `ELECTRON_MIRROR="https://npmmirror.com/mirrors/electron/"`。

## 接手必读的坑(违反会出 bug)

1. **点击清除选中保留区机制**(App.tsx 的 document 捕获监听):点击不在保留区(`.composer-canvas-overlay`、`.composer-timeline .layer-timeline-row`、`.composer-timeline .timeline-toolbar`、`.component-library`、`.inspector-panel`)内会清空选中。**新增任何操作选中节点的按钮/UI,必须同步加入保留区**,否则会出现"素材删不掉"这类竞态(已踩过)。
2. **Remotion 4.0.507 公开 API 限制**(实施中实测确认):`renderMedia/renderFrames/selectComposition` 不接受 `browser`/`puppeteerInstance`;`<Sequence>` 无 `premountFor` 公开 props;帧驱动模型下**不可降低 Player fps 做低配预览**(只能降分辨率)。
3. **`vendor/chrome-headless-shell` 不入 git**,clone 后需外部准备;`after-pack.cjs` 打包期校验 `app.asar.unpacked` 下 compositor 存在。
4. **暂缓项均有文档记录**,不要未经用户确认就扩大范围或删除既有暂缓结论。
5. 动效/素材**选中后可保持**,但点击无关区域即取消;界面改动遵守用户偏好:反馈明确、分辨率输入失焦/回车才生效、纯图标按钮带 `title` + `aria-label`。

## 交付底线

- 任何改动:先 `pnpm check` 全绿,再做最小真实渲染验证;改完交付时清理中间产物、更新校验和、提交 git、同步 HANDOFF.md 变更记录。
- 用户需要能直接测试的 DMG:改完按 `pnpm package:dmg` 交付,并告知安装包路径与验证重点。
