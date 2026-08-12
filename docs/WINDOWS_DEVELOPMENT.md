# Windows 双端开发与打包

## 目标与边界

Motioner 当前支持 Apple Silicon macOS 与 Windows x64。两端必须共用同一套 Renderer UI、项目格式、模板、Composer、导出队列和媒体校验逻辑，不维护 Windows 专属页面。平台差异只允许集中在以下边界：

- BrowserWindow 标题栏、菜单和关闭 / 退出生命周期。
- `Command` 与 `Ctrl` 快捷键映射及显示文本。
- Finder 与文件资源管理器等系统术语。
- 原生可执行文件名、Remotion compositor、Headless Chrome 与安装包目标。

Windows 的窗口使用原生标题栏，渲染工作台尺寸和 CSS 不分叉；点击关闭按钮时仍走应用内“保存 / 不保存 / 取消”流程，确认关闭后 Windows 退出应用，macOS 保留标准的应用生命周期。

## 离线运行时

Windows 导出不能复用 macOS 的 Mach-O 二进制。运行 `pnpm prepare:win` 会固定准备两套 Windows x64 资源：

```text
vendor/remotion-compositor-win32-x64-msvc/
  remotion.exe
  ffmpeg.exe
  ffprobe.exe

vendor/chrome-headless-shell-win32-x64/
  chrome-headless-shell.exe
  icudtl.dat
  ...
```

脚本固定 Remotion `4.0.507` 和 Chrome for Testing `149.0.7790.0`，下载完成后验证版本和关键文件。目录被 Git 忽略，换机、清理 vendor 或升级版本后必须重新执行。可通过 `MOTIONER_WINDOWS_COMPOSITOR_URL` 和 `MOTIONER_WINDOWS_CHROME_URL` 指向可信镜像，但发布前应核对来源与哈希。

Windows 安装包把 compositor 复制到 `resources/remotion-binaries`，把浏览器复制到 `resources/chrome-headless-shell`。应用运行时不会下载依赖，也不要求用户安装 Chrome、FFmpeg 或 FFprobe。

## 开发和构建命令

安装通用依赖并完成质量检查：

```bash
pnpm install
pnpm check
```

准备 Windows 运行时并生成展开目录：

```bash
pnpm prepare:win
pnpm package:win:dir
```

生成唯一正式交付目标——NSIS 安装包：

```bash
pnpm package:win
```

`package:win` 在完整性报告写入安装包大小与 SHA-256 后，会自动清理 `win-unpacked`、blockmap 和 builder 临时配置；如需保留展开目录做调试或 E2E，请使用 `package:win:dir`。

主要产物：

```text
release/win-unpacked/Motioner.exe
release/Motioner-<version>-x64-windows-installer.exe
release/Motioner-integrity-windows-x64.json
```

macOS 可以用 electron-builder 交叉构建 Windows x64 包；首次构建可能下载 Windows Electron、winCodeSign、Wine、NSIS 和 NSIS resources。交叉构建只能证明包结构正确，不能代替 Windows 实机运行。

## 已处理的高风险点

1. 原生依赖必须按目标平台准备，不能根据打包机的 `process.arch` 猜测。Windows compositor 独立 vendor，避免把 macOS 二进制误装进 Windows 包。
2. Windows 可执行文件必须使用 `.exe`。运行时、媒体缓存、FFmpeg 元数据写入、FFprobe 校验和打包校验共用同一平台描述符。
3. Chrome 压缩包不能只复制主程序；`.pak`、ICU、语言和图形库必须整目录保留，否则安装后首次导出才会崩溃。
4. Windows 文件名不能包含 `\\ / : * ? " < > |`，也不能以点或空格结尾；`CON`、`PRN`、`AUX`、`NUL`、`COM1-9`、`LPT1-9` 等保留名会自动加前缀。
5. 快捷键默认使用 `Ctrl+S / Ctrl+Z / Ctrl+Shift+Z / Ctrl+D`，快捷键面板显示 Windows 键名；用户自定义映射继续保存在本机 localStorage，不写入项目文件。
6. Windows 标题栏需要显式运行时图标，菜单默认隐藏但保留 `Ctrl+N/O/S` 等 accelerator；关闭按钮和 `Alt+F4` 都进入同一未保存确认流程。
7. Windows 只交付 NSIS Installer，不交付 portable、zip 或残留的 `win-unpacked`。公开发布需要 Authenticode 代码签名，否则 SmartScreen 可能报警。
8. 不把 Windows 盘符路径直接拼进 FFmpeg filter 字符串。Motioner 当前通过参数数组和本地素材服务传递路径；后续若新增 `movie=`、`subtitles=`、`drawtext=fontfile=` 等滤镜，必须单独处理 `C:`、反斜杠和引号转义。

## 发布前实机验收

在干净的 Windows 10/11 x64 机器执行：

1. 安装、卸载、桌面快捷方式、开始菜单快捷方式和自选安装目录。
2. 原生标题栏的最小化、最大化、关闭与 `Alt+F4`；分别验证无修改、保存退出、不保存退出、取消退出。
3. `Ctrl+N/O/S/Shift+S/Z/Shift+Z/D`、Delete、Backspace、Alt 方向键及快捷键自定义冲突提示。
4. 打开 / 保存 `.mfxproj`，素材选择、字体选择、素材收集和文件夹重链；路径应覆盖中文、空格、非系统盘和较长目录。
5. 实际导出 ProRes 4444、ProRes 4444 XQ、PNG 序列、H.264、Lottie 与三段分段输出；检查 Rec.709、帧数、透明通道、sidecar 和资源管理器定位。
6. 在 `release/win-unpacked` 上运行 `pnpm test:package-e2e`，确认打包应用真实启动内置 Chrome、compositor、FFmpeg 和 FFprobe。
7. 运行 `pnpm verify:package:win`，保存完整性报告与安装包 SHA-256；签名后需重新计算最终安装包哈希。
