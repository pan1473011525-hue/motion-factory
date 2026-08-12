const {execFile} = require("node:child_process");
const {promisify} = require("node:util");
const {existsSync} = require("node:fs");
const {join} = require("node:path");

const run = promisify(execFile);
const archNames = ["ia32", "x64", "armv7l", "arm64", "universal"];

const getTarget = (platform, arch) => {
  if (platform === "darwin" && (arch === "arm64" || arch === "x64")) {
    return {
      compositorPackage: `compositor-darwin-${arch}`,
      executableNames: ["remotion", "ffmpeg", "ffprobe"],
      browserExecutable: "chrome-headless-shell",
    };
  }
  if (platform === "win32" && arch === "x64") {
    return {
      compositorPackage: "compositor-win32-x64-msvc",
      executableNames: ["remotion.exe", "ffmpeg.exe", "ffprobe.exe"],
      browserExecutable: "chrome-headless-shell.exe",
    };
  }
  return null;
};

module.exports = async (context) => {
  const platform = context.electronPlatformName;
  const arch = typeof context.arch === "number" ? archNames[context.arch] : String(context.arch);
  const target = getTarget(platform, arch);
  if (!target) throw new Error(`Motioner 不支持打包目标：${platform}-${arch}`);

  const appRoot = platform === "darwin"
    ? join(context.appOutDir, "Motioner.app")
    : context.appOutDir;
  const resources = platform === "darwin"
    ? join(appRoot, "Contents", "Resources")
    : join(appRoot, "resources");

  if (platform === "darwin") {
    const infoPlist = join(appRoot, "Contents", "Info.plist");
    await run("/usr/libexec/PlistBuddy", [
      "-c",
      "Set :NSAppTransportSecurity:NSAllowsArbitraryLoads false",
      infoPlist,
    ]);
  }

  const compositor = platform === "win32"
    ? join(resources, "remotion-binaries")
    : join(
      resources,
      "app.asar.unpacked",
      "node_modules",
      "@remotion",
      target.compositorPackage,
    );
  const criticalFiles = [
    ...target.executableNames.map((name) => join(compositor, name)),
    join(resources, "chrome-headless-shell", target.browserExecutable),
    join(resources, "remotion", "index.html"),
  ];
  const missing = criticalFiles.filter((path) => !existsSync(path));
  if (missing.length > 0) {
    throw new Error(
      `Motioner ${platform}-${arch} 离线运行时不完整：\n${missing.join("\n")}\n`
      + "请先运行对应平台的 prepare 脚本，并确认 build.asarUnpack 包含 node_modules/@remotion/**/*。",
    );
  }
};
