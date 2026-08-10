import {readdir} from "node:fs/promises";
import {basename, join} from "node:path";
import type {ProjectAsset} from "../../packages/project-model/src";

export const listFilesRecursively = async (root: string, depth = 4, limit = 5_000): Promise<string[]> => {
  const files: string[] = [];
  const visit = async (directory: string, remainingDepth: number): Promise<void> => {
    if (files.length >= limit || remainingDepth < 0) return;
    const entries = await readdir(directory, {withFileTypes: true});
    for (const entry of entries) {
      if (files.length >= limit) return;
      const path = join(directory, entry.name);
      if (entry.isFile()) files.push(path);
      else if (entry.isDirectory() && !entry.name.startsWith(".")) await visit(path, remainingDepth - 1);
    }
  };
  await visit(root, depth);
  return files;
};

export const matchAssetsByName = (
  assets: ProjectAsset[],
  candidates: string[],
): Map<string, string> => {
  const byName = new Map<string, string[]>();
  for (const candidate of candidates) {
    const key = basename(candidate).normalize("NFC").toLocaleLowerCase("zh-CN");
    byName.set(key, [...(byName.get(key) ?? []), candidate]);
  }
  const result = new Map<string, string>();
  const unused = new Set(candidates);
  for (const asset of assets) {
    const key = basename(asset.path).normalize("NFC").toLocaleLowerCase("zh-CN");
    const matched = byName.get(key)?.find((candidate) => unused.has(candidate));
    if (matched) {
      result.set(asset.id, matched);
      unused.delete(matched);
    }
  }
  if (assets.length === 1 && result.size === 0 && candidates.length === 1) {
    result.set(assets[0]!.id, candidates[0]!);
  }
  return result;
};
