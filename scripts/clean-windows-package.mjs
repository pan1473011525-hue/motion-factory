import {existsSync} from "node:fs";
import {readdir, rm} from "node:fs/promises";
import {join} from "node:path";

const root = join(import.meta.dirname, "..");
const release = join(root, "release");
if (!existsSync(release)) process.exit(0);

const generated = [
  "win-unpacked",
  ".icon-ico",
  "builder-debug.yml",
  "builder-effective-config.yaml",
  "latest.yml",
];
for (const name of generated) {
  const path = join(release, name);
  if (!existsSync(path)) continue;
  await rm(path, {recursive: true, force: true});
  console.log(`已清理 release/${name}`);
}

for (const name of await readdir(release)) {
  if (!name.endsWith("-windows-installer.exe.blockmap")) continue;
  await rm(join(release, name), {force: true});
  console.log(`已清理 release/${name}`);
}
