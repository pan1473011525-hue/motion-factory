import {createHash} from "node:crypto";
import {createReadStream, constants} from "node:fs";
import {access, mkdir, open, readFile, stat, writeFile} from "node:fs/promises";
import {join} from "node:path";

const projectRoot = join(import.meta.dirname, "..");
const packageManifest = JSON.parse(await readFile(join(projectRoot, "package.json"), "utf8"));
const readArgument = (name, fallback) => {
  const index = process.argv.indexOf(`--${name}`);
  return index >= 0 ? process.argv[index + 1] : fallback;
};
const platform = readArgument("platform", "darwin");
const arch = readArgument("arch", platform === "darwin" ? "arm64" : "x64");
const verifyInstaller = process.argv.includes("--installer");

const target = (() => {
  if (platform === "darwin" && (arch === "arm64" || arch === "x64")) {
    const appRoot = join(projectRoot, "release", `mac-${arch}`, "Motioner.app");
    return {
      label: `macOS ${arch}`,
      appRoot,
      resources: join(appRoot, "Contents", "Resources"),
      compositorPackage: `compositor-darwin-${arch}`,
      binaries: {remotion: "remotion", ffmpeg: "ffmpeg", ffprobe: "ffprobe"},
      browser: "chrome-headless-shell",
      applicationExecutable: join(appRoot, "Contents", "MacOS", "Motioner"),
      applicationIcon: join(appRoot, "Contents", "Resources", "icon.icns"),
      reportName: "Motioner-integrity.json",
      peExecutables: false,
    };
  }
  if (platform === "win32" && arch === "x64") {
    const appRoot = join(projectRoot, "release", "win-unpacked");
    return {
      label: "Windows x64",
      appRoot,
      resources: join(appRoot, "resources"),
      compositorPackage: "compositor-win32-x64-msvc",
      binaries: {remotion: "remotion.exe", ffmpeg: "ffmpeg.exe", ffprobe: "ffprobe.exe"},
      browser: "chrome-headless-shell.exe",
      applicationExecutable: join(appRoot, "Motioner.exe"),
      applicationIcon: null,
      reportName: "Motioner-integrity-windows-x64.json",
      peExecutables: true,
    };
  }
  throw new Error(`不支持的包校验目标：${platform}-${arch}`);
})();

const compositor = platform === "win32"
  ? join(target.resources, "remotion-binaries")
  : join(
    target.resources,
    "app.asar.unpacked",
    "node_modules",
    "@remotion",
    target.compositorPackage,
  );
const criticalFiles = [
  {name: "Motioner executable", path: target.applicationExecutable, executable: true, pe: target.peExecutables},
  ...(target.applicationIcon ? [{name: "Motioner app icon", path: target.applicationIcon}] : []),
  {name: "Electron ASAR", path: join(target.resources, "app.asar")},
  {name: "Headless Chrome", path: join(target.resources, "chrome-headless-shell", target.browser), executable: true, pe: target.peExecutables},
  {name: "Remotion renderer", path: join(compositor, target.binaries.remotion), executable: true, pe: target.peExecutables},
  {name: "FFmpeg", path: join(compositor, target.binaries.ffmpeg), executable: true, pe: target.peExecutables},
  {name: "FFprobe", path: join(compositor, target.binaries.ffprobe), executable: true, pe: target.peExecutables},
  {name: "Offline Remotion bundle", path: join(target.resources, "remotion", "index.html")},
];

const hashFile = async (path) => new Promise((resolve, reject) => {
  const hash = createHash("sha256");
  const stream = createReadStream(path);
  stream.on("data", (chunk) => hash.update(chunk));
  stream.on("error", reject);
  stream.on("end", () => resolve(hash.digest("hex")));
});

const assertPortableExecutable = async (path) => {
  const file = await open(path, "r");
  try {
    const signature = Buffer.alloc(2);
    await file.read(signature, 0, 2, 0);
    if (signature.toString("ascii") !== "MZ") throw new Error(`Windows 可执行文件签名无效：${path}`);
  } finally {
    await file.close();
  }
};

const verified = [];
for (const file of criticalFiles) {
  const mode = file.executable && platform === "darwin"
    ? constants.R_OK | constants.X_OK
    : constants.R_OK;
  await access(file.path, mode);
  const info = await stat(file.path);
  if (!info.isFile() || info.size === 0) throw new Error(`${file.name} 缺失或为空：${file.path}`);
  if (file.pe) await assertPortableExecutable(file.path);
  verified.push({name: file.name, path: file.path, bytes: info.size, sha256: await hashFile(file.path)});
}

const artifacts = [];
if (verifyInstaller) {
  if (platform !== "win32") throw new Error("--installer 当前只支持 Windows NSIS 包");
  const installerPath = join(
    projectRoot,
    "release",
    `Motioner-${packageManifest.version}-${arch}-windows-installer.exe`,
  );
  await access(installerPath, constants.R_OK);
  await assertPortableExecutable(installerPath);
  const installerInfo = await stat(installerPath);
  if (!installerInfo.isFile() || installerInfo.size === 0) throw new Error(`Windows 安装包缺失或为空：${installerPath}`);
  artifacts.push({
    name: "NSIS installer",
    path: installerPath,
    bytes: installerInfo.size,
    sha256: await hashFile(installerPath),
  });
}

const report = {
  product: "Motioner",
  version: packageManifest.version,
  target: target.label,
  verifiedAt: new Date().toISOString(),
  offlineRuntimeComplete: true,
  criticalFiles: verified,
  artifacts,
};
await mkdir(join(projectRoot, "release"), {recursive: true});
const outputPath = join(projectRoot, "release", target.reportName);
await writeFile(outputPath, `${JSON.stringify(report, null, 2)}\n`, "utf8");
console.log(`PASS Motioner ${target.label} 离线资源完整性：${verified.length} 个关键文件`);
if (artifacts.length > 0) console.log(`PASS ${artifacts[0].name}：${artifacts[0].sha256}`);
console.log(outputPath);
