import {existsSync} from "node:fs";
import {join} from "node:path";

export type MotionerDesktopPlatform = "darwin" | "win32";

export type RuntimePlatformDescriptor = {
  platform: MotionerDesktopPlatform;
  arch: "arm64" | "x64";
  compositorPackage: string;
  browserExecutable: string;
  remotionExecutable: string;
  ffmpegExecutable: string;
  ffprobeExecutable: string;
};

export const getRuntimePlatformDescriptor = (
  platform: NodeJS.Platform = process.platform,
  arch: string = process.arch,
): RuntimePlatformDescriptor | null => {
  if (platform === "darwin" && (arch === "arm64" || arch === "x64")) {
    return {
      platform,
      arch,
      compositorPackage: `compositor-darwin-${arch}`,
      browserExecutable: "chrome-headless-shell",
      remotionExecutable: "remotion",
      ffmpegExecutable: "ffmpeg",
      ffprobeExecutable: "ffprobe",
    };
  }
  if (platform === "win32" && arch === "x64") {
    return {
      platform,
      arch,
      compositorPackage: "compositor-win32-x64-msvc",
      browserExecutable: "chrome-headless-shell.exe",
      remotionExecutable: "remotion.exe",
      ffmpegExecutable: "ffmpeg.exe",
      ffprobeExecutable: "ffprobe.exe",
    };
  }
  return null;
};

export const getRuntimeBinaryPath = (
  directory: string,
  binary: "remotion" | "ffmpeg" | "ffprobe",
  descriptor: RuntimePlatformDescriptor | null = getRuntimePlatformDescriptor(),
): string | null => {
  if (!descriptor) return null;
  const name = binary === "remotion"
    ? descriptor.remotionExecutable
    : binary === "ffmpeg"
      ? descriptor.ffmpegExecutable
      : descriptor.ffprobeExecutable;
  return join(directory, name);
};

export const hasCompleteRuntimeBinaries = (
  directory: string,
  descriptor: RuntimePlatformDescriptor | null = getRuntimePlatformDescriptor(),
): boolean => descriptor !== null && ["remotion", "ffmpeg", "ffprobe"].every((binary) => {
  const path = getRuntimeBinaryPath(directory, binary as "remotion" | "ffmpeg" | "ffprobe", descriptor);
  return path !== null && existsSync(path);
});
