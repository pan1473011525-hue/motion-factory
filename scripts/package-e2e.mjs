import {spawn} from "node:child_process";
import {existsSync} from "node:fs";
import {mkdir, readFile} from "node:fs/promises";
import {join} from "node:path";

const root = join(import.meta.dirname, "..");
const executable = join(root, "release", "mac-arm64", "Motioner.app", "Contents", "MacOS", "Motioner");
if (!existsSync(executable)) throw new Error("请先运行 pnpm package:mac 或 package:dmg");
const directory = join(root, "output", "package-e2e", new Date().toISOString().replaceAll(":", "-"));
await mkdir(directory, {recursive: true});
const output = join(directory, "packaged-review.mp4");
const code = await new Promise((resolve, reject) => {
  const child = spawn(executable, [], {env: {...process.env, MOTIONER_E2E_OUTPUT: output}, stdio: "inherit"});
  child.once("error", reject);
  child.once("close", resolve);
});
if (code !== 0) throw new Error(`打包应用 E2E 退出代码：${code}`);
if (!existsSync(output) || !existsSync(`${output}.motioner.json`)) throw new Error("打包应用没有生成成片或导出报告");
const e2e = JSON.parse(await readFile(`${output}.e2e.json`, "utf8"));
const validation = e2e.event?.validation;
if (!validation?.ok || validation.codec !== "h264" || validation.colorSpace !== "bt709" || validation.colorPrimaries !== "bt709" || validation.colorTransfer !== "bt709") {
  throw new Error(`打包应用验证结果不正确：${JSON.stringify(validation)}`);
}
process.stdout.write(`PASS 打包应用 E2E：${validation.summary}\n${output}\n`);
