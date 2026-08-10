import {readFile, writeFile, mkdir} from "node:fs/promises";
import {dirname} from "node:path";

export type RecentProjectEntry = {path: string; name: string; openedAt: string};

export const readRecentProjects = async (storePath: string): Promise<RecentProjectEntry[]> => {
  try {
    const parsed = JSON.parse(await readFile(storePath, "utf8")) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((entry): entry is RecentProjectEntry =>
      typeof entry === "object" && entry !== null
      && typeof (entry as RecentProjectEntry).path === "string"
      && typeof (entry as RecentProjectEntry).name === "string"
      && typeof (entry as RecentProjectEntry).openedAt === "string");
  } catch {
    return [];
  }
};

export const recordRecentProject = async (
  storePath: string,
  entry: RecentProjectEntry,
): Promise<RecentProjectEntry[]> => {
  const current = await readRecentProjects(storePath);
  const next = [entry, ...current.filter((candidate) => candidate.path !== entry.path)].slice(0, 10);
  await mkdir(dirname(storePath), {recursive: true});
  await writeFile(storePath, `${JSON.stringify(next, null, 2)}\n`, "utf8");
  return next;
};
