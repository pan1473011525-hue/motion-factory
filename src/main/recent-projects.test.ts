import {mkdtemp, rm} from "node:fs/promises";
import {tmpdir} from "node:os";
import {join} from "node:path";
import {afterEach, describe, expect, it} from "vitest";
import {readRecentProjects, recordRecentProject} from "./recent-projects";

let temporaryDirectory: string | null = null;
afterEach(async () => {
  if (temporaryDirectory) await rm(temporaryDirectory, {recursive: true, force: true});
  temporaryDirectory = null;
});

describe("recent projects", () => {
  it("keeps the newest occurrence and survives reload", async () => {
    temporaryDirectory = await mkdtemp(join(tmpdir(), "motioner-recent-"));
    const path = join(temporaryDirectory, "recent.json");
    await recordRecentProject(path, {path: "/a.mfxproj", name: "A", openedAt: "2026-08-09T10:00:00Z"});
    await recordRecentProject(path, {path: "/b.mfxproj", name: "B", openedAt: "2026-08-09T11:00:00Z"});
    await recordRecentProject(path, {path: "/a.mfxproj", name: "A2", openedAt: "2026-08-09T12:00:00Z"});
    expect(await readRecentProjects(path)).toEqual([
      {path: "/a.mfxproj", name: "A2", openedAt: "2026-08-09T12:00:00Z"},
      {path: "/b.mfxproj", name: "B", openedAt: "2026-08-09T11:00:00Z"},
    ]);
  });
});
