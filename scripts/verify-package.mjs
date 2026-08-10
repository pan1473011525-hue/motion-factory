import {createHash} from "node:crypto";
import {createReadStream, constants} from "node:fs";
import {access, mkdir, readFile, stat, writeFile} from "node:fs/promises";
import {join} from "node:path";

const projectRoot = join(import.meta.dirname, "..");
const packageManifest = JSON.parse(await readFile(join(projectRoot, "package.json"), "utf8"));
const appRoot = join(projectRoot, "release", "mac-arm64", "Motioner.app");
const resources = join(appRoot, "Contents", "Resources");
const compositor = join(resources, "app.asar.unpacked", "node_modules", "@remotion", "compositor-darwin-arm64");
const criticalFiles = [
  {name: "Motioner executable", path: join(appRoot, "Contents", "MacOS", "Motioner"), executable: true},
  {name: "Motioner app icon", path: join(resources, "icon.icns")},
  {name: "Electron ASAR", path: join(resources, "app.asar")},
  {name: "Headless Chrome", path: join(resources, "chrome-headless-shell", "chrome-headless-shell"), executable: true},
  {name: "Remotion renderer", path: join(compositor, "remotion"), executable: true},
  {name: "FFmpeg", path: join(compositor, "ffmpeg"), executable: true},
  {name: "FFprobe", path: join(compositor, "ffprobe"), executable: true},
  {name: "Offline Remotion bundle", path: join(resources, "remotion", "index.html")},
];

const hashFile = async (path) => new Promise((resolve, reject) => {
  const hash = createHash("sha256");
  const stream = createReadStream(path);
  stream.on("data", (chunk) => hash.update(chunk));
  stream.on("error", reject);
  stream.on("end", () => resolve(hash.digest("hex")));
});

const verified = [];
for (const file of criticalFiles) {
  await access(file.path, file.executable ? constants.R_OK | constants.X_OK : constants.R_OK);
  const info = await stat(file.path);
  if (!info.isFile() || info.size === 0) throw new Error(`${file.name} 缺失或为空：${file.path}`);
  verified.push({name: file.name, path: file.path, bytes: info.size, sha256: await hashFile(file.path)});
}

const report = {
  product: "Motioner",
  version: packageManifest.version,
  target: "macOS arm64",
  verifiedAt: new Date().toISOString(),
  offlineRuntimeComplete: true,
  criticalFiles: verified,
};
await mkdir(join(projectRoot, "release"), {recursive: true});
const outputPath = join(projectRoot, "release", "Motioner-integrity.json");
await writeFile(outputPath, `${JSON.stringify(report, null, 2)}\n`, "utf8");
console.log(`PASS Motioner 离线资源完整性：${verified.length} 个关键文件`);
console.log(outputPath);
