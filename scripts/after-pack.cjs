const {execFile} = require("node:child_process");
const {promisify} = require("node:util");
const {existsSync} = require("node:fs");
const {join} = require("node:path");

const run = promisify(execFile);

module.exports = async (context) => {
  if (context.electronPlatformName !== "darwin") return;
  const infoPlist = join(context.appOutDir, "Motioner.app", "Contents", "Info.plist");
  await run("/usr/libexec/PlistBuddy", [
    "-c",
    "Set :NSAppTransportSecurity:NSAllowsArbitraryLoads false",
    infoPlist,
  ]);

  // Remotion compositor 原生二进制必须位于 app.asar.unpacked,运行时才能加载。
  // 打包期校验,失败立即报错,避免发布后首次导出才暴露缺失。
  const architecture = context.arch === "arm64" ? "arm64" : "x64";
  const compositor = join(
    context.appOutDir,
    "Motioner.app",
    "Contents",
    "Resources",
    "app.asar.unpacked",
    "node_modules",
    "@remotion",
    `compositor-darwin-${architecture}`,
  );
  if (!existsSync(join(compositor, "remotion"))) {
    throw new Error(
      `未找到 Remotion compositor 原生二进制:${join(compositor, "remotion")}。请确认 package.json 的 build.asarUnpack 包含 node_modules/@remotion/**/*`,
    );
  }
};
