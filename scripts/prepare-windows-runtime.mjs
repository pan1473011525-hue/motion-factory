import {spawn} from "node:child_process";
import {createHash} from "node:crypto";
import {createReadStream, existsSync} from "node:fs";
import {cp, mkdtemp, mkdir, readFile, rm, stat, writeFile} from "node:fs/promises";
import {tmpdir} from "node:os";
import {basename, dirname, join} from "node:path";

const root = join(import.meta.dirname, "..");
const runtimeCache = join(root, "vendor", ".runtime-cache");
const compositorVersion = "4.0.507";
const compositorSha512 = "FCkZDLcPBCO2WO/MyrtMB5tpsIuqqkc7E1nY2lfY6WmRX2quGfykcsz4S9inYx/G+XybKVTgplqnyLtt9wyFnw==";
const compositorUrl = process.env.MOTIONER_WINDOWS_COMPOSITOR_URL
  ?? `https://registry.npmjs.org/@remotion/compositor-win32-x64-msvc/-/compositor-win32-x64-msvc-${compositorVersion}.tgz`;
const chromeVersion = "149.0.7790.0";
const chromeMd5 = "e03ce7f8c51ebe9bd88774b097b2d467";
const chromeUrl = process.env.MOTIONER_WINDOWS_CHROME_URL
  ?? `https://storage.googleapis.com/chrome-for-testing-public/${chromeVersion}/win64/chrome-headless-shell-win64.zip`;
const chromeDestination = join(root, "vendor", "chrome-headless-shell-win32-x64");
const versionFile = join(chromeDestination, "VERSION");
const compositorDestination = join(root, "vendor", "remotion-compositor-win32-x64-msvc");

const run = (command, args) => new Promise((resolve, reject) => {
  const child = spawn(command, args, {stdio: "inherit"});
  child.once("error", reject);
  child.once("close", (code) => code === 0 ? resolve() : reject(new Error(`${command} 退出代码：${code}`)));
});

const isNonEmptyFile = async (path) => {
  try {
    const info = await stat(path);
    return info.isFile() && info.size > 0;
  } catch {
    return false;
  }
};

const hashFile = (path, algorithm, encoding) => new Promise((resolve, reject) => {
  const hash = createHash(algorithm);
  const stream = createReadStream(path);
  stream.on("data", (chunk) => hash.update(chunk));
  stream.on("error", reject);
  stream.on("end", () => resolve(hash.digest(encoding)));
});

const compositorIsReady = async () => {
  const required = ["remotion.exe", "ffmpeg.exe", "ffprobe.exe"]
    .map((name) => join(compositorDestination, name));
  for (const path of required) if (!await isNonEmptyFile(path)) return false;
  try {
    const manifest = JSON.parse(await readFile(join(compositorDestination, "package.json"), "utf8"));
    return manifest.version === compositorVersion;
  } catch {
    return false;
  }
};

const browserIsReady = async () => {
  if (!await isNonEmptyFile(join(chromeDestination, "chrome-headless-shell.exe"))) return false;
  if (!await isNonEmptyFile(join(chromeDestination, "icudtl.dat"))) return false;
  try {
    return (await readFile(versionFile, "utf8")).trim() === chromeVersion;
  } catch {
    return false;
  }
};

const extractArchive = async (archive, destination) => {
  if (process.platform === "win32") {
    await run("powershell.exe", [
      "-NoProfile",
      "-NonInteractive",
      "-Command",
      "Expand-Archive -LiteralPath $args[0] -DestinationPath $args[1] -Force",
      archive,
      destination,
    ]);
    return;
  }
  if (process.platform === "darwin") {
    await run("ditto", ["-x", "-k", archive, destination]);
    return;
  }
  await run("unzip", ["-q", archive, "-d", destination]);
};

const downloadToFile = async (url, path, label, expectedHash) => {
  await mkdir(dirname(path), {recursive: true});
  console.log(`${existsSync(path) ? "续传" : "下载"} ${label}…`);
  const curl = process.platform === "win32" ? "curl.exe" : "curl";
  try {
    await run(curl, [
      "--fail",
      "--location",
      "--retry", "8",
      "--retry-delay", "3",
      "--retry-all-errors",
      "--connect-timeout", "30",
      "--max-time", "1800",
      "--continue-at", "-",
      "--output", path,
      url,
    ]);
    const actual = await hashFile(path, expectedHash.algorithm, expectedHash.encoding);
    if (actual !== expectedHash.value) {
      throw new Error(`${label} 哈希不匹配：预期 ${expectedHash.value}，实际 ${actual}`);
    }
  } catch (error) {
    if (error instanceof Error && error.message.includes("哈希不匹配")) {
      await rm(path, {force: true});
    }
    throw error;
  }
};

const downloadWindowsCompositor = async () => {
  const temporary = await mkdtemp(join(tmpdir(), "motioner-windows-compositor-"));
  const archive = join(runtimeCache, `compositor-win32-x64-msvc-${compositorVersion}.tgz`);
  const extracted = join(temporary, "extracted");
  try {
    await downloadToFile(compositorUrl, archive, `Windows Remotion compositor ${compositorVersion}`, {
      algorithm: "sha512",
      encoding: "base64",
      value: compositorSha512,
    });
    await mkdir(extracted, {recursive: true});
    await run("tar", ["-xzf", archive, "-C", extracted]);
    const source = join(extracted, "package");
    if (!existsSync(join(source, "remotion.exe"))) {
      throw new Error(`Remotion compositor 压缩包结构无效：${source}`);
    }
    await rm(compositorDestination, {recursive: true, force: true});
    await mkdir(dirname(compositorDestination), {recursive: true});
    await cp(source, compositorDestination, {recursive: true, force: true});
    await rm(archive, {force: true});
  } finally {
    await rm(temporary, {recursive: true, force: true});
  }
};

const downloadWindowsChrome = async () => {
  const temporary = await mkdtemp(join(tmpdir(), "motioner-windows-runtime-"));
  const archive = join(runtimeCache, basename(new URL(chromeUrl).pathname));
  const extracted = join(temporary, "extracted");
  try {
    await downloadToFile(chromeUrl, archive, `Windows Headless Chrome ${chromeVersion}`, {
      algorithm: "md5",
      encoding: "hex",
      value: chromeMd5,
    });
    await mkdir(extracted, {recursive: true});
    await extractArchive(archive, extracted);
    const source = join(extracted, "chrome-headless-shell-win64");
    if (!existsSync(join(source, "chrome-headless-shell.exe"))) {
      throw new Error(`Chrome 压缩包结构无效：${source}`);
    }
    await rm(chromeDestination, {recursive: true, force: true});
    await mkdir(dirname(chromeDestination), {recursive: true});
    await cp(source, chromeDestination, {recursive: true, force: true});
    await writeFile(versionFile, `${chromeVersion}\n`, "utf8");
    await rm(archive, {force: true});
  } finally {
    await rm(temporary, {recursive: true, force: true});
  }
};

if (!await compositorIsReady()) await downloadWindowsCompositor();
if (!await compositorIsReady()) throw new Error("Windows Remotion compositor 准备后校验失败");
if (!await browserIsReady()) await downloadWindowsChrome();
if (!await browserIsReady()) throw new Error("Windows Headless Chrome 准备后校验失败");
console.log(`PASS Windows x64 离线运行时已准备：${compositorDestination}、${chromeDestination}`);
