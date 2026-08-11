import {
  makeCancelSignal,
  renderFrames,
  renderMedia,
  selectComposition,
} from "@remotion/renderer";
import {spawn, type ChildProcessWithoutNullStreams} from "node:child_process";
import {createReadStream, existsSync} from "node:fs";
import {mkdir, readFile, readdir, rename, rm, rmdir, stat, unlink, writeFile} from "node:fs/promises";
import {createServer, type Server} from "node:http";
import {once} from "node:events";
import {basename, dirname, extname, join} from "node:path";
import type {ProjectAsset} from "../../packages/project-model/src";
import type {
  ExportValidation,
  RenderEvent,
  RenderWorkerMessage,
  RenderWorkerStartMessage,
} from "../shared/contracts";
import {getExportPreset, type ExportPresetId} from "../shared/export-presets";
import {buildLottieExport} from "../shared/lottie-export";
import {
  buildSectionRanges,
  buildSectionsDocument,
  getSectionFileName,
  type SectionArtifact,
} from "../shared/section-export";

const parentPort = process.parentPort;

if (!parentPort) {
  throw new Error("渲染进程必须由 Electron UtilityProcess 启动");
}

const activeCancels = new Map<string, () => void>();
const cancelledJobs = new Set<string>();
let lastCancellationAt = 0;

// 渲染失败自动重试(浏览器/compositor 崩溃等瞬时故障):每个任务只重试一次。
const retriedJobs = new Set<string>();

const USER_ERROR_PATTERN = /磁盘空间不足|素材文件已丢失|不是空文件夹|目标文件已存在|校验未通过|参数无效|目标文件夹/u;

const shouldRetryRender = (jobId: string, error: unknown): boolean => {
  if (retriedJobs.has(jobId) || cancelledJobs.has(jobId)) return false;
  const message = error instanceof Error ? error.message : String(error);
  if (USER_ERROR_PATTERN.test(message)) return false;
  return true;
};

process.on("unhandledRejection", (reason) => {
  const error = reason instanceof Error ? reason as NodeJS.ErrnoException : null;
  if (error?.code === "EPIPE" && Date.now() - lastCancellationAt < 10_000) {
    return;
  }
  console.error("Motioner 渲染进程出现未处理的异步错误", reason);
});

const getContentType = (path: string): string => {
  const extension = path.split(".").at(-1)?.toLowerCase();
  if (extension === "png") return "image/png";
  if (extension === "jpg" || extension === "jpeg") return "image/jpeg";
  if (extension === "webp") return "image/webp";
  if (extension === "gif") return "image/gif";
  if (extension === "svg") return "image/svg+xml";
  if (extension === "ttf") return "font/ttf";
  if (extension === "otf") return "font/otf";
  if (extension === "woff") return "font/woff";
  if (extension === "woff2") return "font/woff2";
  if (extension === "mov") return "video/quicktime";
  if (extension === "webm") return "video/webm";
  return "video/mp4";
};

const createAssetServer = async (assets: ProjectAsset[]): Promise<{
  server: Server | null;
  runtimeAssets: Array<ProjectAsset & {src?: string}>;
}> => {
  if (assets.length === 0) return {server: null, runtimeAssets: []};
  const byId = new Map(assets.map((asset) => [asset.id, asset]));
  const server = createServer(async (request, response) => {
    response.setHeader("Access-Control-Allow-Origin", "*");
    response.setHeader("Accept-Ranges", "bytes");
    try {
      const id = decodeURIComponent(new URL(request.url ?? "/", "http://127.0.0.1").pathname.slice(1));
      const asset = byId.get(id);
      if (!asset) {
        response.writeHead(404).end();
        return;
      }
      const info = await stat(asset.path);
      const range = request.headers.range?.match(/bytes=(\d+)-(\d*)/);
      const start = range ? Number(range[1]) : 0;
      const end = range?.[2] ? Math.min(Number(range[2]), info.size - 1) : info.size - 1;
      response.writeHead(range ? 206 : 200, {
        "Content-Type": getContentType(asset.path),
        "Content-Length": end - start + 1,
        ...(range ? {"Content-Range": `bytes ${start}-${end}/${info.size}`} : {}),
      });
      createReadStream(asset.path, {start, end}).pipe(response);
    } catch {
      response.writeHead(500).end();
    }
  });
  server.listen(0, "127.0.0.1");
  await once(server, "listening");
  const address = server.address();
  if (!address || typeof address === "string") throw new Error("无法启动本地素材服务器");
  return {
    server,
    runtimeAssets: assets.map((asset) => ({
      ...asset,
      src: `http://127.0.0.1:${address.port}/${encodeURIComponent(asset.id)}`,
    })),
  };
};

const emit = (event: RenderEvent): void => {
  parentPort.postMessage(event);
};

const parseRate = (value: unknown): number => {
  if (typeof value !== "string") return 0;
  const [numeratorText, denominatorText] = value.split("/");
  const numerator = Number(numeratorText ?? 0);
  const denominator = Number(denominatorText ?? 1);
  return denominator ? numerator / denominator : 0;
};

type ProbeStream = {
  codec_type?: string;
  codec_name?: string;
  profile?: string | number;
  pix_fmt?: string;
  width?: number;
  height?: number;
  avg_frame_rate?: string;
  r_frame_rate?: string;
  nb_read_frames?: string;
  nb_frames?: string;
  color_space?: string;
  color_primaries?: string;
  color_transfer?: string;
};

const runBinary = async (
  executable: string,
  args: string[],
  cwd: string,
  onChild: (child: ChildProcessWithoutNullStreams | null) => void,
): Promise<string> => {
  const child = spawn(executable, args, {cwd});
  onChild(child);
  let stdout = "";
  let stderr = "";
  child.stdout.setEncoding("utf8");
  child.stderr.setEncoding("utf8");
  child.stdout.on("data", (chunk: string) => { stdout += chunk; });
  child.stderr.on("data", (chunk: string) => { stderr += chunk; });
  const [code, signal] = await once(child, "close") as [number | null, NodeJS.Signals | null];
  onChild(null);
  if (code !== 0) {
    throw new Error(signal ? `媒体校验进程被终止（${signal}）` : `媒体校验失败：${stderr.trim() || `退出代码 ${code}`}`);
  }
  return stdout;
};

const validateVideoOutput = async (
  message: RenderWorkerStartMessage,
  presetId: ExportPresetId,
  onChild: (child: ChildProcessWithoutNullStreams | null) => void,
  expectedFrames = message.project.canvas.durationInFrames,
): Promise<ExportValidation> => {
  const directory = message.binariesDirectory;
  if (!directory) {
    throw new Error("未找到内置 FFprobe，无法验证导出文件");
  }
  const ffprobe = join(directory, "ffprobe");
  const ffmpeg = join(directory, "ffmpeg");
  if (!existsSync(ffprobe) || !existsSync(ffmpeg)) {
    throw new Error("内置媒体校验工具不完整");
  }

  const raw = await runBinary(ffprobe, [
    "-v", "error",
    "-count_frames",
    "-show_streams",
    "-show_format",
    "-of", "json",
    message.outputLocation,
  ], directory, onChild);
  const payload = JSON.parse(raw) as {streams?: ProbeStream[]};
  const streams = payload.streams ?? [];
  const video = streams.find((stream) => stream.codec_type === "video");
  if (!video) throw new Error("校验失败：输出文件没有视频轨");
  if (streams.some((stream) => stream.codec_type === "audio")) {
    throw new Error("校验失败：动效文件不应包含音轨");
  }

  const expectedFps = message.project.canvas.fps.numerator / message.project.canvas.fps.denominator;
  const actualFps = parseRate(video.avg_frame_rate ?? video.r_frame_rate);
  const frames = Number(video.nb_read_frames ?? video.nb_frames ?? 0);
  const codec = video.codec_name ?? "unknown";
  const profile = video.profile === undefined ? null : String(video.profile);
  const pixelFormat = video.pix_fmt ?? null;
  const dimensionsMatch = video.width === message.project.canvas.width && video.height === message.project.canvas.height;
  const frameRateMatches = Math.abs(actualFps - expectedFps) < 0.01;
  const frameCountMatches = frames === expectedFrames;
  const codecMatches = presetId === "h264-review" ? codec === "h264" : codec === "prores";
  const profileMatches = presetId === "prores-4444"
    ? profile === "4"
    : presetId === "prores-4444-xq"
      ? profile === "5"
      : true;
  const alphaMatches = presetId === "h264-review"
    ? pixelFormat === "yuv420p"
    : pixelFormat?.startsWith("yuva") === true;
  const colorMatches = video.color_space === "bt709"
    && video.color_primaries === "bt709"
    && video.color_transfer === "bt709";

  if (!dimensionsMatch || !frameRateMatches || !frameCountMatches || !codecMatches || !profileMatches || !alphaMatches || !colorMatches) {
    throw new Error([
      "导出文件校验未通过",
      `编码 ${codec} profile ${profile ?? "unknown"} / ${pixelFormat ?? "unknown"}`,
      `尺寸 ${video.width ?? 0}×${video.height ?? 0}`,
      `帧率 ${actualFps || 0}`,
      `帧数 ${frames}`,
      `色彩 ${video.color_space ?? "unknown"}/${video.color_primaries ?? "unknown"}/${video.color_transfer ?? "unknown"}`,
    ].join("；"));
  }

  await runBinary(ffmpeg, [
    "-v", "error",
    "-i", message.outputLocation,
    "-map", "0:v:0",
    "-c:v", "rawvideo",
    "-f", "null",
    "-",
  ], directory, onChild);
  const outputStat = await stat(message.outputLocation);

  return {
    ok: true,
    summary: `${codec} profile ${profile ?? "—"} · ${pixelFormat} · Rec.709 · ${video.width}×${video.height} · ${actualFps.toFixed(3)} fps · ${frames} 帧`,
    codec,
    profile,
    pixelFormat,
    width: video.width ?? 0,
    height: video.height ?? 0,
    fps: actualFps,
    frames,
    fileSizeBytes: outputStat.size,
    colorSpace: video.color_space ?? null,
    colorPrimaries: video.color_primaries ?? null,
    colorTransfer: video.color_transfer ?? null,
  };
};

const validatePngSequence = async (message: RenderWorkerStartMessage): Promise<ExportValidation> => {
  const files = (await readdir(message.outputLocation))
    .filter((file) => /^motioner-\d+\.png$/u.test(file))
    .sort();
  if (files.length !== message.project.canvas.durationInFrames) {
    throw new Error(`PNG 序列校验失败：预期 ${message.project.canvas.durationInFrames} 帧，实际 ${files.length} 帧`);
  }
  const fileStats = await Promise.all(files.map((file) => stat(join(message.outputLocation, file))));
  const first = fileStats[0];
  const last = fileStats.at(-1)!;
  if (first.size === 0 || last.size === 0) throw new Error("PNG 序列首帧或末帧为空文件");
  const fps = message.project.canvas.fps.numerator / message.project.canvas.fps.denominator;
  return {
    ok: true,
    summary: `PNG RGBA · ${message.project.canvas.width}×${message.project.canvas.height} · ${fps.toFixed(3)} fps · ${files.length} 帧`,
    codec: "png",
    profile: null,
    pixelFormat: "rgba",
    width: message.project.canvas.width,
    height: message.project.canvas.height,
    fps,
    frames: files.length,
    fileSizeBytes: fileStats.reduce((total, file) => total + file.size, 0),
    colorSpace: null,
    colorPrimaries: null,
    colorTransfer: null,
  };
};

const ensureRec709Metadata = async (
  message: RenderWorkerStartMessage,
  presetId: ExportPresetId,
  onChild: (child: ChildProcessWithoutNullStreams | null) => void,
): Promise<void> => {
  if (!message.binariesDirectory) throw new Error("未找到内置 FFmpeg，无法写入 Rec.709 元数据");
  const ffmpeg = join(message.binariesDirectory, "ffmpeg");
  const sourcePath = `${message.outputLocation}.untagged`;
  await rename(message.outputLocation, sourcePath);
  try {
    await runBinary(ffmpeg, [
      "-v", "error",
      "-i", sourcePath,
      "-map", "0:v:0",
      "-c:v", "copy",
      ...(presetId === "h264-review" ? ["-bsf:v", "h264_metadata=video_full_range_flag=0:colour_primaries=1:transfer_characteristics=1:matrix_coefficients=1"] : []),
      "-colorspace", "bt709",
      "-color_primaries", "bt709",
      "-color_trc", "bt709",
      "-color_range", "tv",
      "-map_metadata", "-1",
      "-movflags", "+faststart",
      message.outputLocation,
    ], message.binariesDirectory, onChild);
  } catch (error) {
    if (!existsSync(message.outputLocation) && existsSync(sourcePath)) await rename(sourcePath, message.outputLocation);
    throw error;
  } finally {
    await unlink(sourcePath).catch(() => undefined);
  }
};

const validateLottieOutput = async (message: RenderWorkerStartMessage): Promise<ExportValidation> => {
  const raw = await readFile(message.outputLocation, "utf8");
  const parsed = JSON.parse(raw) as {layers?: unknown[]; w?: number; h?: number; op?: number} | null;
  if (!parsed || !Array.isArray(parsed.layers)) {
    throw new Error("Lottie 导出校验失败：JSON 结构无效");
  }
  const outputStat = await stat(message.outputLocation);
  return {
    ok: true,
    summary: `Lottie · ${parsed.layers.length} 层 · ${(outputStat.size / 1024).toFixed(1)} KB`,
    codec: "lottie",
    profile: null,
    pixelFormat: null,
    width: parsed.w ?? 0,
    height: parsed.h ?? 0,
    fps: 0,
    frames: parsed.op ?? 0,
    fileSizeBytes: outputStat.size,
    colorSpace: null,
    colorPrimaries: null,
    colorTransfer: null,
  };
};

const aggregateSectionValidations = (validations: ReadonlyArray<ExportValidation>): ExportValidation => {
  const first = validations[0];
  if (!first || validations.some((validation) => !validation.ok)) {
    throw new Error("分段导出校验失败：没有可用的分段结果");
  }
  const frames = validations.reduce((total, validation) => total + validation.frames, 0);
  const fileSizeBytes = validations.reduce((total, validation) => total + validation.fileSizeBytes, 0);
  return {
    ...first,
    summary: `${first.codec} · ${validations.length} 段 · ${first.width}×${first.height} · ${first.fps.toFixed(3)} fps · ${frames} 帧`,
    frames,
    fileSizeBytes,
  };
};

const promoteOutput = async (
  temporaryPath: string,
  finalPath: string,
  overwriteExisting: boolean,
  jobId: string,
): Promise<void> => {
  if (!existsSync(finalPath)) {
    await rename(temporaryPath, finalPath);
    return;
  }
  if (!overwriteExisting) throw new Error("目标文件已存在；请选择自动版本号、覆盖或跳过策略");
  const backupPath = join(dirname(finalPath), `.${basename(finalPath)}.motioner-backup-${jobId}`);
  await rename(finalPath, backupPath);
  try {
    await rename(temporaryPath, finalPath);
    await rm(backupPath, {recursive: true, force: true});
  } catch (error) {
    if (!existsSync(finalPath) && existsSync(backupPath)) await rename(backupPath, finalPath);
    throw error;
  }
};

const isCancelledRender = (jobId: string, error: unknown): boolean =>
  cancelledJobs.has(jobId) || (error instanceof Error && error.message.toLowerCase().includes("cancel"));

const runRender = async (message: RenderWorkerStartMessage): Promise<void> => {
  const {cancel, cancelSignal} = makeCancelSignal();
  let validationChild: ChildProcessWithoutNullStreams | null = null;
  activeCancels.set(message.jobId, () => {
    lastCancellationAt = Date.now();
    cancelledJobs.add(message.jobId);
    cancel();
    validationChild?.kill("SIGTERM");
  });

  let assetServer: Server | null = null;
  const preset = getExportPreset(message.project.exportPresetId);
  const finalOutputLocation = message.outputLocation;
  const sectionRanges = buildSectionRanges(
    message.project.segments ?? [],
    message.project.canvas.durationInFrames,
    message.project.canvas.fps,
  );
  const isSegmentedVideo = preset.kind === "video"
    && message.project.exportOptions.segmented
    && sectionRanges.length > 1;
  const extension = extname(finalOutputLocation);
  const stem = basename(finalOutputLocation, extension);
  const temporaryOutputLocation = preset.kind === "image-sequence" || isSegmentedVideo
    ? join(dirname(finalOutputLocation), `.${basename(finalOutputLocation)}.motioner-${message.jobId}`)
    : join(dirname(finalOutputLocation), `.${stem}.motioner-${message.jobId}.partial${extension}`);
  const workingMessage: RenderWorkerStartMessage = {...message, outputLocation: temporaryOutputLocation};
  const sectionArtifacts: SectionArtifact<ExportValidation>[] = [];
  let promoted = false;
  try {
    emit({
      type: "progress",
      jobId: message.jobId,
      progress: 0,
      renderedFrames: 0,
      encodedFrames: 0,
      stage: "preparing",
    });

    const assetRuntime = await createAssetServer(message.project.assets);
    assetServer = assetRuntime.server;
    const runtimeInputProps = {
      mode: message.project.editorMode,
      templateId: message.project.template.id,
      templateProps: message.project.props,
      composition: message.project.composition,
      assets: assetRuntime.runtimeAssets,
      motionSettings: message.project.animation,
      typography: message.project.typography,
      ...(preset.id === "h264-review" ? {reviewBackground: "#0B0E12"} : {}),
    };
    const composition = await selectComposition({
      serveUrl: message.serveUrl,
      id: "MotionerComposition",
      inputProps: runtimeInputProps,
      browserExecutable: message.browserExecutable ?? undefined,
      binariesDirectory: message.binariesDirectory,
      logLevel: "warn",
    });
    const renderComposition = {
      ...composition,
      width: message.project.canvas.width,
      height: message.project.canvas.height,
      fps: message.project.canvas.fps.numerator / message.project.canvas.fps.denominator,
      durationInFrames: message.project.canvas.durationInFrames,
    };

    if (preset.kind === "lottie") {
      // Lottie 导出无需 Remotion 渲染:直接由 Composer 场景序列化为 Lottie JSON。
      const {json, warnings} = buildLottieExport(message.project.composition, message.project.canvas, message.project.canvas.durationInFrames);
      await mkdir(dirname(temporaryOutputLocation), {recursive: true});
      await writeFile(temporaryOutputLocation, JSON.stringify(json));
      if (warnings.length > 0) {
        emit({
          type: "progress",
          jobId: message.jobId,
          progress: 1,
          renderedFrames: message.project.canvas.durationInFrames,
          encodedFrames: 0,
          stage: "validating",
        });
      }
    } else if (preset.kind === "image-sequence") {
      if (!message.overwriteExisting && existsSync(finalOutputLocation) && (await readdir(finalOutputLocation)).length > 0) {
        throw new Error("PNG 序列目标文件夹不是空文件夹，请选择新的输出位置");
      }
      await mkdir(temporaryOutputLocation, {recursive: true});
      await renderFrames({
        composition: renderComposition,
        serveUrl: message.serveUrl,
        outputDir: temporaryOutputLocation,
        inputProps: runtimeInputProps,
        imageFormat: "png",
        imageSequencePattern: "motioner-[frame].[ext]",
        muted: true,
        concurrency: "50%",
        offthreadVideoCacheSizeInBytes: 512 * 1024 * 1024,
        cancelSignal,
        browserExecutable: message.browserExecutable ?? undefined,
        binariesDirectory: message.binariesDirectory,
        logLevel: "warn",
        onStart: () => undefined,
        onFrameUpdate: (framesRendered) => {
          emit({
            type: "progress",
            jobId: message.jobId,
            progress: framesRendered / message.project.canvas.durationInFrames,
            renderedFrames: framesRendered,
            encodedFrames: 0,
            stage: "rendering",
          });
        },
      });
    } else {
      const isReview = preset.id === "h264-review";
      const renderVideoRange = async (
        outputLocation: string,
        frameRange: [number, number] | null,
        completedFrames: number,
        rangeFrameCount: number,
      ): Promise<void> => {
        await renderMedia({
          composition: renderComposition,
          serveUrl: message.serveUrl,
          codec: isReview ? "h264" : "prores",
          ...(isReview
            ? {imageFormat: "png" as const, pixelFormat: "yuv420p" as const, crf: 18, x264Preset: "medium" as const}
            : {imageFormat: "png" as const, pixelFormat: "yuva444p10le" as const, proResProfile: preset.id === "prores-4444-xq" ? "4444-xq" as const : "4444" as const}),
          outputLocation,
          inputProps: runtimeInputProps,
          ...(frameRange ? {frameRange} : {}),
          overwrite: true,
          muted: true,
          concurrency: "50%",
          offthreadVideoCacheSizeInBytes: 512 * 1024 * 1024,
          cancelSignal,
          browserExecutable: message.browserExecutable ?? undefined,
          binariesDirectory: message.binariesDirectory,
          logLevel: "warn",
          colorSpace: "bt709",
          onProgress: (progress) => {
            const renderedFrames = completedFrames + Math.min(rangeFrameCount, progress.renderedFrames);
            const encodedFrames = completedFrames + Math.min(rangeFrameCount, progress.encodedFrames);
            emit({
              type: "progress",
              jobId: message.jobId,
              progress: Math.min(1, (completedFrames + progress.progress * rangeFrameCount) / message.project.canvas.durationInFrames),
              renderedFrames,
              encodedFrames,
              stage: progress.stitchStage === "encoding" ? "encoding" : "rendering",
            });
          },
        });
      };

      if (isSegmentedVideo) {
        await mkdir(temporaryOutputLocation, {recursive: true});
        let completedFrames = 0;
        for (const [index, section] of sectionRanges.entries()) {
          if (cancelledJobs.has(message.jobId)) throw new Error("导出已取消");
          const fileName = getSectionFileName(section, index, preset.extension ?? "mov");
          const outputLocation = join(temporaryOutputLocation, fileName);
          await renderVideoRange(
            outputLocation,
            [section.fromFrame, section.toFrame],
            completedFrames,
            section.frameCount,
          );
          const sectionMessage = {...workingMessage, outputLocation};
          await ensureRec709Metadata(sectionMessage, preset.id, (child) => { validationChild = child; });
          const validation = await validateVideoOutput(
            sectionMessage,
            preset.id,
            (child) => { validationChild = child; },
            section.frameCount,
          );
          sectionArtifacts.push({section, fileName, validation});
          completedFrames += section.frameCount;
        }
      } else {
        await renderVideoRange(
          temporaryOutputLocation,
          null,
          0,
          message.project.canvas.durationInFrames,
        );
      }
    }

    if (cancelledJobs.has(message.jobId)) throw new Error("导出已取消");
    if (preset.kind === "video" && !isSegmentedVideo) {
      await ensureRec709Metadata(workingMessage, preset.id, (child) => { validationChild = child; });
    }
    emit({
      type: "progress",
      jobId: message.jobId,
      progress: 1,
      renderedFrames: message.project.canvas.durationInFrames,
      encodedFrames: preset.kind === "video" ? message.project.canvas.durationInFrames : 0,
      stage: "validating",
    });
    const validation = isSegmentedVideo
      ? aggregateSectionValidations(sectionArtifacts.map((artifact) => artifact.validation))
      : preset.kind === "image-sequence"
        ? await validatePngSequence(workingMessage)
        : preset.kind === "lottie"
          ? await validateLottieOutput(workingMessage)
          : await validateVideoOutput(workingMessage, preset.id, (child) => { validationChild = child; });

    const exportedAt = new Date().toISOString();
    const report = `${JSON.stringify({
      application: "Motioner",
      exportedAt,
      jobId: message.jobId,
      projectId: message.project.id,
      projectName: message.project.name,
      template: message.project.template,
      presetId: preset.id,
      canvas: message.project.canvas,
      outputLocation: finalOutputLocation,
      segmented: isSegmentedVideo,
      sectionCount: isSegmentedVideo ? sectionArtifacts.length : undefined,
      validation,
    }, null, 2)}\n`;

    if (isSegmentedVideo) {
      const sectionsDocument = buildSectionsDocument({
        exportedAt,
        jobId: message.jobId,
        projectId: message.project.id,
        projectName: message.project.name,
        fps: message.project.canvas.fps,
        width: message.project.canvas.width,
        height: message.project.canvas.height,
        colorSpace: validation.colorSpace,
        artifacts: sectionArtifacts,
      });
      await writeFile(join(temporaryOutputLocation, "motioner-export-report.json"), report, "utf8");
      await writeFile(
        join(temporaryOutputLocation, "sections.json"),
        `${JSON.stringify(sectionsDocument, null, 2)}\n`,
        "utf8",
      );
    }

    if (preset.kind === "image-sequence" && existsSync(finalOutputLocation) && !message.overwriteExisting) {
      await rmdir(finalOutputLocation);
    }
    await promoteOutput(temporaryOutputLocation, finalOutputLocation, message.overwriteExisting, message.jobId);
    promoted = true;

    if (!isSegmentedVideo) {
      const reportPath = preset.kind === "image-sequence"
        ? join(finalOutputLocation, "motioner-export-report.json")
        : `${finalOutputLocation}.motioner.json`;
      await writeFile(reportPath, report, "utf8");
    }

    if (!isSegmentedVideo && preset.kind === "video" && sectionRanges.length > 1) {
      // 未开启多文件导出时仍保留整片 sidecar，兼容既有下游工作流。
      const fps = message.project.canvas.fps.numerator / message.project.canvas.fps.denominator;
      await writeFile(`${finalOutputLocation}.sections.json`, `${JSON.stringify({
        application: "Motioner",
        exportedAt,
        jobId: message.jobId,
        projectId: message.project.id,
        canvas: message.project.canvas,
        codec: validation.codec,
        width: validation.width,
        height: validation.height,
        fps,
        colorSpace: validation.colorSpace,
        segments: sectionRanges,
      }, null, 2)}\n`, "utf8");
    }

    emit({
      type: "complete",
      jobId: message.jobId,
      outputLocation: finalOutputLocation,
      presetId: preset.id,
      validation,
    });
  } catch (error) {
    if (shouldRetryRender(message.jobId, error)) {
      retriedJobs.add(message.jobId);
      // 在 finally 清理完成后重新渲染,只重试一次。
      setImmediate(() => {
        void runRender(message);
      });
      return;
    }
    const cancelled = isCancelledRender(message.jobId, error);
    emit({
      type: "error",
      jobId: message.jobId,
      message: cancelled ? "导出已取消" : error instanceof Error ? error.message : String(error),
      cancelled,
      presetId: preset.id,
    });
  } finally {
    assetServer?.close();
    if (!promoted && existsSync(temporaryOutputLocation)) {
      if (preset.kind === "image-sequence" || isSegmentedVideo) await rm(temporaryOutputLocation, {recursive: true, force: true});
      else await unlink(temporaryOutputLocation).catch(() => undefined);
    }
    activeCancels.delete(message.jobId);
    cancelledJobs.delete(message.jobId);
  }
};

parentPort.on("message", (event) => {
  const message = event.data as RenderWorkerMessage;
  if (message.type === "cancel") {
    activeCancels.get(message.jobId)?.();
    return;
  }
  void runRender(message);
});
