import {describe, expect, it} from "vitest";
import {getRuntimeBinaryPath, getRuntimePlatformDescriptor} from "./runtime-platform";

describe("desktop runtime platform", () => {
  it("maps Apple Silicon runtime names", () => {
    const descriptor = getRuntimePlatformDescriptor("darwin", "arm64");
    expect(descriptor?.compositorPackage).toBe("compositor-darwin-arm64");
    expect(getRuntimeBinaryPath("/runtime", "ffmpeg", descriptor)).toBe("/runtime/ffmpeg");
  });

  it("maps Windows x64 runtime names including executable suffixes", () => {
    const descriptor = getRuntimePlatformDescriptor("win32", "x64");
    expect(descriptor?.compositorPackage).toBe("compositor-win32-x64-msvc");
    expect(descriptor?.browserExecutable).toBe("chrome-headless-shell.exe");
    expect(getRuntimeBinaryPath("C:\\runtime", "ffprobe", descriptor)).toMatch(/ffprobe\.exe$/u);
  });

  it("rejects unsupported Windows arm64 builds", () => {
    expect(getRuntimePlatformDescriptor("win32", "arm64")).toBeNull();
  });
});
