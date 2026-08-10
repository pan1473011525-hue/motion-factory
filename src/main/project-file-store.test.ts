import {mkdtemp, rm, writeFile} from "node:fs/promises";
import {tmpdir} from "node:os";
import {join} from "node:path";
import {afterEach, describe, expect, it} from "vitest";
import {createDefaultProject} from "../shared/default-project";
import {
  readProjectFile,
  readRecoveryFile,
  removeRecoveryFile,
  writeProjectFile,
  writeRecoveryFile,
} from "./project-file-store";

let testDirectory: string | null = null;

afterEach(async () => {
  if (testDirectory) {
    await rm(testDirectory, {recursive: true, force: true});
    testDirectory = null;
  }
});

describe("project file store", () => {
  it("writes projects atomically and reads them back", async () => {
    testDirectory = await mkdtemp(join(tmpdir(), "motion-factory-project-"));
    const path = join(testDirectory, "测试项目.mfxproj");
    const project = createDefaultProject(
      "3ce0f817-8aa1-4c1e-9016-e814d09b34df",
      "2026-08-09T12:00:00.000Z",
    );

    await writeProjectFile(path, project);
    expect(await readProjectFile(path)).toEqual(project);
  });

  it("stores and discards an untitled recovery snapshot", async () => {
    testDirectory = await mkdtemp(join(tmpdir(), "motion-factory-recovery-"));
    const path = join(testDirectory, "active.mfxrecovery");
    const project = createDefaultProject(
      "3ce0f817-8aa1-4c1e-9016-e814d09b34df",
      "2026-08-09T12:00:00.000Z",
    );
    const snapshot = {
      project,
      sourcePath: null,
      savedAt: "2026-08-09T12:00:01.000Z",
    };

    await writeRecoveryFile(path, snapshot);
    expect(await readRecoveryFile(path)).toEqual(snapshot);
    await removeRecoveryFile(path);
    expect(await readRecoveryFile(path)).toBeNull();
  });

  it("migrates a version 1 recovery snapshot into the composer-capable project format", async () => {
    testDirectory = await mkdtemp(join(tmpdir(), "motion-factory-recovery-v1-"));
    const path = join(testDirectory, "active.mfxrecovery");
    const project = createDefaultProject(
      "3ce0f817-8aa1-4c1e-9016-e814d09b34df",
      "2026-08-09T12:00:00.000Z",
    );
    const legacyProject = JSON.parse(JSON.stringify(project)) as Record<string, unknown>;
    legacyProject.formatVersion = 1;
    delete legacyProject.editorMode;
    delete legacyProject.composition;

    await writeFile(path, JSON.stringify({
      project: legacyProject,
      sourcePath: null,
      savedAt: "2026-08-09T12:00:01.000Z",
    }), "utf8");

    const recovered = await readRecoveryFile(path);
    expect(recovered?.project.formatVersion).toBe(2);
    expect(recovered?.project.editorMode).toBe("template");
    expect(recovered?.project.composition.nodes).toEqual([]);
  });
});
