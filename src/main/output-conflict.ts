import {existsSync} from "node:fs";
import {basename, dirname, extname, join} from "node:path";
import type {ProjectExportOptions} from "../../packages/project-model/src";

export type OutputResolution = {path: string; overwriteExisting: boolean; skipped: boolean};

export const getVersionedOutputPath = (path: string): string => {
  if (!existsSync(path)) return path;
  const extension = extname(path);
  const stem = basename(path, extension);
  for (let version = 2; version <= 9_999; version += 1) {
    const candidate = join(dirname(path), `${stem}-v${version}${extension}`);
    if (!existsSync(candidate)) return candidate;
  }
  throw new Error("无法为导出文件找到可用版本号");
};

export const resolveOutputConflict = (
  path: string,
  policy: ProjectExportOptions["conflictPolicy"],
): OutputResolution => {
  if (!existsSync(path)) return {path, overwriteExisting: false, skipped: false};
  if (policy === "version") return {path: getVersionedOutputPath(path), overwriteExisting: false, skipped: false};
  if (policy === "skip") return {path, overwriteExisting: false, skipped: true};
  return {path, overwriteExisting: true, skipped: false};
};
