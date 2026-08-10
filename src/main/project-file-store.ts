import {randomUUID} from "node:crypto";
import {mkdir, readFile, rename, unlink, writeFile} from "node:fs/promises";
import {dirname} from "node:path";
import {z} from "zod";
import {
  motionProjectSchema,
  parseMotionProjectJson,
  serializeMotionProject,
  type MotionProject,
} from "../../packages/project-model/src";
import type {RecoverySnapshot} from "../shared/contracts";

const recoverySnapshotSchema = z.object({
  project: z.unknown(),
  sourcePath: z.string().nullable(),
  savedAt: z.string().datetime({offset: true}),
});

const writeTextAtomically = async (path: string, contents: string): Promise<void> => {
  await mkdir(dirname(path), {recursive: true});
  const temporaryPath = `${path}.${randomUUID()}.tmp`;
  await writeFile(temporaryPath, contents, "utf8");
  await rename(temporaryPath, path);
};

export const readProjectFile = async (path: string): Promise<MotionProject> =>
  parseMotionProjectJson(await readFile(path, "utf8"));

export const writeProjectFile = async (
  path: string,
  project: MotionProject,
): Promise<void> => writeTextAtomically(path, serializeMotionProject(project));

export const readRecoveryFile = async (
  path: string,
): Promise<RecoverySnapshot | null> => {
  try {
    const envelope = recoverySnapshotSchema.parse(JSON.parse(await readFile(path, "utf8")));
    return {...envelope, project: parseMotionProjectJson(JSON.stringify(envelope.project))};
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      return null;
    }
    throw error;
  }
};

export const writeRecoveryFile = async (
  path: string,
  snapshot: RecoverySnapshot,
): Promise<void> => {
  const parsed = recoverySnapshotSchema.parse({...snapshot, project: motionProjectSchema.parse(snapshot.project)});
  await writeTextAtomically(path, `${JSON.stringify(parsed, null, 2)}\n`);
};

export const removeRecoveryFile = async (path: string): Promise<void> => {
  try {
    await unlink(path);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") {
      throw error;
    }
  }
};
