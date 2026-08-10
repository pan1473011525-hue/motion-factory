import {mkdtemp, writeFile} from "node:fs/promises";
import {tmpdir} from "node:os";
import {join} from "node:path";
import {describe, expect, it} from "vitest";
import {resolveOutputConflict} from "./output-conflict";

describe("output conflict policy", () => {
  it("leaves unused paths unchanged", () => {
    expect(resolveOutputConflict("/tmp/motioner-definitely-unused.mov", "version")).toEqual({
      path: "/tmp/motioner-definitely-unused.mov",
      overwriteExisting: false,
      skipped: false,
    });
  });

  it("resolves version, replace and skip without deleting the existing target", async () => {
    const directory = await mkdtemp(join(tmpdir(), "motioner-conflict-"));
    const target = join(directory, "output.mov");
    await writeFile(target, "existing", "utf8");
    expect(resolveOutputConflict(target, "version")).toEqual({path: join(directory, "output-v2.mov"), overwriteExisting: false, skipped: false});
    expect(resolveOutputConflict(target, "replace")).toEqual({path: target, overwriteExisting: true, skipped: false});
    expect(resolveOutputConflict(target, "skip")).toEqual({path: target, overwriteExisting: false, skipped: true});
  });
});
