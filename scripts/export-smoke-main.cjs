const {randomUUID} = require("node:crypto");
const {spawnSync} = require("node:child_process");
const {existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync} = require("node:fs");
const {join} = require("node:path");
const {app, utilityProcess} = require("electron");

const projectRoot = join(__dirname, "..");
const isWindows = process.platform === "win32";
const compositorPackage = isWindows
  ? "compositor-win32-x64-msvc"
  : `compositor-darwin-${process.arch === "arm64" ? "arm64" : "x64"}`;
const runtimeBinary = (name) => `${name}${isWindows ? ".exe" : ""}`;
const browserExecutable = isWindows
  ? join(projectRoot, "vendor", "chrome-headless-shell-win32-x64", "chrome-headless-shell.exe")
  : join(projectRoot, "vendor", "chrome-headless-shell", "chrome-headless-shell");

const findBinariesDirectory = () => {
  if (isWindows) {
    const vendored = join(projectRoot, "vendor", "remotion-compositor-win32-x64-msvc");
    if (existsSync(join(vendored, runtimeBinary("ffprobe")))) return vendored;
  }
  const direct = join(projectRoot, "node_modules", "@remotion", compositorPackage);
  if (existsSync(join(direct, runtimeBinary("ffprobe")))) return direct;
  const pnpmRoot = join(projectRoot, "node_modules", ".pnpm");
  const packageFolder = readdirSync(pnpmRoot).find((entry) =>
    entry.startsWith(`@remotion+${compositorPackage}@`));
  if (!packageFolder) throw new Error("未找到 Remotion 媒体二进制");
  const directory = join(
    pnpmRoot,
    packageFolder,
    "node_modules",
    "@remotion",
    compositorPackage,
  );
  if (!existsSync(join(directory, runtimeBinary("ffprobe")))) throw new Error("FFprobe 不存在");
  return directory;
};

const makeComposerNode = (id, componentId, name, transform, props, durationInFrames) => ({
  id,
  name,
  componentId,
  transform: {rotation: 0, anchorX: 0.5, anchorY: 0.5, opacity: 1, zIndex: 0, ...transform},
  timing: {from: 0, durationInFrames},
  motion: {enter: "rise", enterDuration: 15, exit: "fade", exitDuration: 15, loop: "none", intensity: 1},
  props,
  hidden: false,
  locked: false,
});

const makeProject = (scenario) => ({
  formatVersion: 2,
  id: randomUUID(),
  name: scenario.name,
  template: scenario.template ?? {id: "stat-counter", version: "1.2.0"},
  canvas: {
    width: scenario.width ?? 640,
    height: scenario.height ?? 360,
    fps: scenario.fps ?? {numerator: 30, denominator: 1},
    durationInFrames: scenario.durationInFrames ?? 60,
    colorSpace: "rec709",
    transparent: true,
  },
  props: scenario.props ?? {
    title: "Motioner 导出验证",
    value: 128.6,
    prefix: "",
    suffix: "%",
    source: "自动化 Smoke Test",
    decimals: 1,
    accentColor: "#47A7FF",
    stylePreset: "editorial",
  },
  assets: scenario.assets ?? [],
  typography: scenario.typography ?? {fontAssetId: "", fallbackFamily: "system"},
  animation: {speed: 1, reducedMotion: false, edgeFrames: 18},
  editorMode: scenario.editorMode ?? "template",
  composition: scenario.composition ?? {backgroundColor: "transparent", snapToGrid: true, gridSize: 0.025, nodes: []},
  exportPresetId: scenario.presetId,
  segments: scenario.segments ?? [],
  exportOptions: {conflictPolicy: "version", segmented: scenario.segmented ?? false},
  updatedAt: new Date().toISOString(),
});

const run = async () => {
  await app.whenReady();
  const productionMode = process.argv.includes("--production");
  const cancelMode = process.argv.includes("--cancel");
  const outputRoot = join(projectRoot, "output", productionMode ? "export-production" : cancelMode ? "export-cancel" : "export-smoke", new Date().toISOString().replaceAll(":", "-"));
  mkdirSync(outputRoot, {recursive: true});
  const binariesDirectory = findBinariesDirectory();
  const videoFixture = join(outputRoot, "motioner-video-fixture.mp4");
  if (productionMode) {
    const videoPoster = join(outputRoot, "motioner-video-poster.png");
    writeFileSync(videoPoster, Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=", "base64"));
    const generated = spawnSync(join(binariesDirectory, runtimeBinary("ffmpeg")), ["-y", "-v", "error", "-loop", "1", "-i", videoPoster, "-t", "2", "-vf", "scale=640:360", "-r", "30", "-c:v", "libx264", "-pix_fmt", "yuv420p", videoFixture], {cwd: binariesDirectory, encoding: "utf8"});
    if (generated.status !== 0) throw new Error(`无法生成视频测试素材：${generated.stderr}`);
  }
  const worker = utilityProcess.fork(join(projectRoot, "out", "main", "render-worker.js"), [], {
    serviceName: "Motioner Export Smoke Test",
  });
  const scenarios = productionMode ? [
    {
      name: "4K-29.97-ProRes",
      presetId: "prores-4444",
      fileName: "4k-29.97-prores-4444.mov",
      width: 3840,
      height: 2160,
      fps: {numerator: 30_000, denominator: 1_001},
      durationInFrames: 75,
      typography: {fontAssetId: "fixture-font", fallbackFamily: "mono"},
      assets: [{id: "fixture-font", path: isWindows ? join(process.env.WINDIR || "C:\\Windows", "Fonts", "consola.ttf") : "/System/Library/Fonts/SFNSMono.ttf", kind: "font"}],
    },
    {
      name: "1080p-59.94-Review",
      presetId: "h264-review",
      fileName: "1080p-59.94-review.mp4",
      width: 1920,
      height: 1080,
      fps: {numerator: 60_000, denominator: 1_001},
      durationInFrames: 180,
    },
    {
      name: "30s-Soak-Review",
      presetId: "h264-review",
      fileName: "30s-soak-review.mp4",
      width: 1280,
      height: 720,
      durationInFrames: 900,
    },
    {
      name: "Media-Asset-ProRes",
      presetId: "prores-4444",
      fileName: "media-asset-prores.mov",
      width: 1920,
      height: 1080,
      durationInFrames: 90,
      template: {id: "media-info", version: "1.2.0"},
      props: {
        assetId: "fixture-media",
        title: "素材链路验证",
        body: "本项目会通过本地白名单素材服务器读取图像，并在透明 ProRes 中保留完整内容。",
        source: "Motioner 自动化测试",
        layout: "media-left",
        mediaFit: "cover",
        focalX: 50,
        focalY: 50,
        mediaScale: 1,
        mediaRadius: 0,
        videoInSeconds: 0,
        videoOutSeconds: 0,
        playbackRate: 1,
        playbackMode: "hold",
        accentColor: "#47A7FF",
        stylePreset: "editorial",
      },
      assets: [{
        id: "fixture-media",
        path: join(projectRoot, "scripts", "fixtures", "media-sample.svg"),
        kind: "image",
      }],
    },
    {
      name: "Media-Video-Playback",
      presetId: "h264-review",
      fileName: "media-video-playback.mp4",
      width: 640,
      height: 360,
      durationInFrames: 90,
      template: {id: "media-info", version: "1.2.0"},
      props: {
        assetId: "fixture-video",
        title: "视频入出点验证",
        body: "验证入点、出点、倍速与循环播放在预览和最终导出中保持确定性。",
        source: "Motioner 自动化测试",
        layout: "media-left",
        mediaFit: "cover",
        focalX: 50,
        focalY: 50,
        mediaScale: 1,
        mediaRadius: 0,
        videoInSeconds: 0.2,
        videoOutSeconds: 1.6,
        playbackRate: 1.25,
        playbackMode: "loop",
        accentColor: "#47A7FF",
        stylePreset: "editorial",
      },
      assets: [{id: "fixture-video", path: videoFixture, kind: "video"}],
    },
    {
      name: "Composer-Scene-Review",
      presetId: "h264-review",
      fileName: "composer-scene-review.mp4",
      width: 1280,
      height: 720,
      durationInFrames: 120,
      editorMode: "composer",
      composition: {
        backgroundColor: "transparent",
        snapToGrid: true,
        gridSize: 0.025,
        nodes: [
          makeComposerNode("composer-surface", "rectangle", "底板", {x: 0.06, y: 0.09, width: 0.88, height: 0.82, zIndex: 0}, {fill: "#111821", borderColor: "#34465A", borderWidth: 2, radius: 28}, 120),
          makeComposerNode("composer-title", "title", "标题", {x: 0.11, y: 0.17, width: 0.54, height: 0.18, zIndex: 1}, {text: "Composer 导出验证", color: "#F4F7FB", fontSize: 88, fontWeight: 720, align: "left"}, 120),
          makeComposerNode("composer-stat", "stat-number", "数据", {x: 0.11, y: 0.42, width: 0.34, height: 0.25, zIndex: 2}, {value: 87.3, decimals: 1, prefix: "", suffix: "%", label: "完成率", color: "#47A7FF"}, 120),
          makeComposerNode("composer-progress", "progress", "进度", {x: 0.11, y: 0.7, width: 0.48, height: 0.12, zIndex: 3}, {value: 87.3, label: "渲染链路", showValue: true, accentColor: "#47A7FF", trackColor: "#323B47"}, 120),
          makeComposerNode("composer-chart", "bar-chart", "柱图", {x: 0.62, y: 0.25, width: 0.25, height: 0.48, zIndex: 4}, {title: "四期数据", labels: "A,B,C,D", values: "35,52,68,87", accentColor: "#47A7FF", textColor: "#F4F7FB", showValues: true}, 120),
        ],
      },
    },
  ] : cancelMode ? [
    {name: "Recovery-after-cancel", presetId: "h264-review", fileName: "recovery-after-cancel.mp4", durationInFrames: 60},
  ] : [
    {name: "Smoke-prores-4444", presetId: "prores-4444", fileName: "prores-4444.mov"},
    {name: "Smoke-prores-4444-xq", presetId: "prores-4444-xq", fileName: "prores-4444-xq.mov"},
    {name: "Smoke-png-sequence", presetId: "png-sequence", fileName: "png-sequence"},
    {name: "Smoke-h264-review", presetId: "h264-review", fileName: "review.mp4"},
    {
      name: "Smoke-h264-segments",
      presetId: "h264-review",
      fileName: "review-segments",
      segmented: true,
      segments: [
        {id: randomUUID(), label: "段 2", frame: 20},
        {id: randomUUID(), label: "收尾", frame: 40},
      ],
    },
  ];
  const results = [];

  if (cancelMode) {
    const jobId = randomUUID();
    const outputLocation = join(outputRoot, "must-not-exist.mp4");
    let cancellationSent = false;
    await new Promise((resolve, reject) => {
      const timeout = setTimeout(() => reject(new Error("取消导出测试超时")), 30_000);
      const listener = (event) => {
        if (event.jobId !== jobId) return;
        if (event.type === "progress" && event.renderedFrames >= 4 && !cancellationSent) {
          cancellationSent = true;
          worker.postMessage({type: "cancel", jobId});
        }
        if (event.type === "complete") {
          clearTimeout(timeout);
          reject(new Error("取消请求后任务仍然完成"));
        }
        if (event.type === "error") {
          clearTimeout(timeout);
          worker.removeListener("message", listener);
          if (!event.cancelled) reject(new Error(`任务未按取消状态结束：${event.message}`));
          else resolve();
        }
      };
      worker.on("message", listener);
      worker.postMessage({
        type: "start",
        jobId,
        serveUrl: join(projectRoot, "dist", "remotion"),
        outputLocation,
        browserExecutable,
        binariesDirectory,
        overwriteExisting: false,
        project: makeProject({name: "Cancel-test", presetId: "h264-review", width: 1920, height: 1080, durationInFrames: 900}),
      });
    });
    if (existsSync(outputLocation) || readdirSync(outputRoot).some((name) => name.includes(".motioner-"))) {
      throw new Error("取消导出后仍残留最终文件或临时文件");
    }
    console.log("[cancel] PASS 已取消、无残留，继续验证工作进程恢复");
  }

  for (const scenario of scenarios) {
    const {presetId, fileName} = scenario;
    const jobId = randomUUID();
    const outputLocation = join(outputRoot, fileName);
    const terminal = await new Promise((resolve, reject) => {
      const listener = (event) => {
        if (event.jobId !== jobId) return;
        if (event.type === "progress" && (event.stage === "validating" || event.progress === 0)) {
          console.log(`[${presetId}] ${event.stage} ${Math.round(event.progress * 100)}%`);
        }
        if (event.type === "complete") {
          worker.removeListener("message", listener);
          resolve(event);
        }
        if (event.type === "error") {
          worker.removeListener("message", listener);
          reject(new Error(`[${presetId}] ${event.message}`));
        }
      };
      worker.on("message", listener);
      worker.postMessage({
        type: "start",
        jobId,
        serveUrl: join(projectRoot, "dist", "remotion"),
        outputLocation,
        browserExecutable,
        binariesDirectory,
        overwriteExisting: false,
        project: makeProject(scenario),
      });
    });
    if (scenario.segmented) {
      const sectionsPath = join(outputLocation, "sections.json");
      if (!existsSync(sectionsPath)) throw new Error("分段导出没有生成 sections.json");
      const sections = JSON.parse(readFileSync(sectionsPath, "utf8"));
      if (sections.segments?.length !== 3) throw new Error(`分段数量错误：${JSON.stringify(sections)}`);
      for (const section of sections.segments) {
        if (!existsSync(join(outputLocation, section.fileName)) || section.nb_frames !== section.frameCount) {
          throw new Error(`分段文件或帧数错误：${JSON.stringify(section)}`);
        }
      }
    }
    results.push({presetId, outputLocation, validation: terminal.validation});
    console.log(`[${presetId}] PASS ${terminal.validation.summary}`);
  }

  worker.kill();
  console.log(JSON.stringify({mode: productionMode ? "production" : cancelMode ? "cancel" : "smoke", outputRoot, results}, null, 2));
  app.quit();
};

run().catch((error) => {
  console.error(error);
  app.exit(1);
});
