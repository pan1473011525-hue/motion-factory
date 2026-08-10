import {spawn} from "node:child_process";
import {existsSync} from "node:fs";
import {mkdir} from "node:fs/promises";
import {extname, join} from "node:path";
import type {ProjectAsset} from "../../packages/project-model/src";
import {fingerprintFile} from "./asset-fingerprint";

const run = async (executable: string, args: string[]): Promise<string> => new Promise((resolve, reject) => {
  const child = spawn(executable, args, {stdio: ["ignore", "pipe", "pipe"]});
  let stdout = "";
  let stderr = "";
  child.stdout.setEncoding("utf8");
  child.stderr.setEncoding("utf8");
  child.stdout.on("data", (chunk: string) => { stdout += chunk; });
  child.stderr.on("data", (chunk: string) => { stderr += chunk; });
  child.once("error", reject);
  child.once("close", (code) => code === 0 ? resolve(stdout) : reject(new Error(stderr.trim() || `媒体缓存命令退出：${code}`)));
});

const imageExtensions = new Set([".png", ".jpg", ".jpeg", ".webp", ".gif", ".tif", ".tiff"]);

export const prepareMediaCache = async (
  asset: ProjectAsset,
  cacheRoot: string,
  binariesDirectory: string | null,
): Promise<ProjectAsset> => {
  const fingerprint = await fingerprintFile(asset.path);
  const base = fingerprint.slice(0, 24);
  if (!binariesDirectory || asset.kind === "font") return {...asset, fingerprint};
  const ffmpeg = join(binariesDirectory, "ffmpeg");
  const ffprobe = join(binariesDirectory, "ffprobe");
  if (!existsSync(ffmpeg) || !existsSync(ffprobe)) return {...asset, fingerprint};
  const thumbnails = join(cacheRoot, "thumbnails");
  const proxies = join(cacheRoot, "proxies");
  await Promise.all([mkdir(thumbnails, {recursive: true}), mkdir(proxies, {recursive: true})]);
  const thumbnailPath = join(thumbnails, `${base}.jpg`);

  if (asset.kind === "image") {
    if (!imageExtensions.has(extname(asset.path).toLowerCase())) return {...asset, fingerprint};
    if (!existsSync(thumbnailPath)) {
      await run(ffmpeg, ["-v", "error", "-i", asset.path, "-frames:v", "1", "-vf", "scale=480:-2:force_original_aspect_ratio=decrease", "-q:v", "3", thumbnailPath]).catch(() => undefined);
    }
    return {...asset, fingerprint, ...(existsSync(thumbnailPath) ? {thumbnailPath} : {})};
  }

  if (asset.kind !== "video") return {...asset, fingerprint};
  const proxyPath = join(proxies, `${base}.mp4`);
  const rawDuration = await run(ffprobe, ["-v", "error", "-show_entries", "format=duration", "-of", "default=noprint_wrappers=1:nokey=1", asset.path]).catch(() => "");
  const durationSeconds = Number(rawDuration.trim());
  if (!existsSync(thumbnailPath)) {
    await run(ffmpeg, ["-v", "error", "-ss", "0", "-i", asset.path, "-frames:v", "1", "-vf", "scale=480:-2:force_original_aspect_ratio=decrease", "-q:v", "3", thumbnailPath]).catch(() => undefined);
  }
  if (!existsSync(proxyPath)) {
    await run(ffmpeg, ["-v", "error", "-i", asset.path, "-map", "0:v:0", "-vf", "scale=min(1280\\,iw):-2:force_original_aspect_ratio=decrease", "-c:v", "libx264", "-preset", "veryfast", "-crf", "24", "-pix_fmt", "yuv420p", "-an", "-movflags", "+faststart", proxyPath]).catch(() => undefined);
  }
  return {
    ...asset,
    fingerprint,
    ...(existsSync(thumbnailPath) ? {thumbnailPath} : {}),
    ...(existsSync(proxyPath) ? {proxyPath} : {}),
    ...(Number.isFinite(durationSeconds) && durationSeconds > 0 ? {durationSeconds} : {}),
  };
};
