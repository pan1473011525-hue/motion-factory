import {spawn} from "node:child_process";
import {existsSync} from "node:fs";
import {mkdir, readFile} from "node:fs/promises";
import {join} from "node:path";

const root = join(import.meta.dirname, "..");
const executable = join(root, "release", "mac-arm64", "Motioner.app", "Contents", "MacOS", "Motioner");
if (!existsSync(executable)) throw new Error("请先运行 pnpm package:mac 或 package:dmg");
const directory = join(root, "output", "package-e2e", new Date().toISOString().replaceAll(":", "-"));
await mkdir(directory, {recursive: true});
const output = join(directory, "packaged-review-segments");
const code = await new Promise((resolve, reject) => {
  const child = spawn(executable, [], {env: {...process.env, MOTIONER_E2E_OUTPUT: output}, stdio: "inherit"});
  child.once("error", reject);
  child.once("close", resolve);
});
if (code !== 0) throw new Error(`打包应用 E2E 退出代码：${code}`);
if (!existsSync(output) || !existsSync(join(output, "motioner-export-report.json")) || !existsSync(join(output, "sections.json"))) {
  throw new Error("打包应用没有生成分段成片、导出报告或 sections.json");
}
const e2e = JSON.parse(await readFile(`${output}.e2e.json`, "utf8"));
const validation = e2e.event?.validation;
if (!validation?.ok || validation.codec !== "h264" || validation.colorSpace !== "bt709" || validation.colorPrimaries !== "bt709" || validation.colorTransfer !== "bt709") {
  throw new Error(`打包应用验证结果不正确：${JSON.stringify(validation)}`);
}
const sections = JSON.parse(await readFile(join(output, "sections.json"), "utf8"));
if (sections.segmented !== true || sections.segments?.length !== 3) {
  throw new Error(`分段清单不正确：${JSON.stringify(sections)}`);
}
for (const section of sections.segments) {
  if (!section.fileName || !existsSync(join(output, section.fileName))) {
    throw new Error(`分段文件不存在：${section.fileName ?? "unknown"}`);
  }
  if (section.nb_frames !== section.frameCount || section.codec_name !== "h264" || section.avg_frame_rate !== "30/1") {
    throw new Error(`分段媒体元数据不正确：${JSON.stringify(section)}`);
  }
}
process.stdout.write(`PASS 打包应用分段 E2E：${validation.summary}\n${output}\n`);
