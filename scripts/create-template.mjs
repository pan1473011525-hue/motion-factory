import {mkdir, readFile, writeFile} from "node:fs/promises";
import {join, resolve} from "node:path";
import {createTemplateFiles, registryInsertions, replaceRequiredMarker} from "./template-generator-core.mjs";

const args = Object.fromEntries(process.argv.slice(2).filter((arg) => arg.startsWith("--") && arg.includes("=")).map((arg) => {
  const [key, ...value] = arg.slice(2).split("=");
  return [key, value.join("=")];
}));
const id = args.id;
const name = args.name;
if (!id || !name) throw new Error("用法：pnpm template:new --id=template-id --name=中文名称 [--category=information] [--dry-run=true]");
const generated = createTemplateFiles({id, name, category: args.category});
const insertions = registryInsertions({id, componentName: generated.componentName, manifestName: generated.manifestName});
if (args["dry-run"] === "true") {
  process.stdout.write(`${JSON.stringify({id, name, files: [`src/templates/${id}/manifest.ts`, `src/remotion/generated/${id}.tsx`], insertions}, null, 2)}\n`);
  process.exit(0);
}
const root = resolve(import.meta.dirname, "..");
const catalogPath = join(root, "src", "templates", "catalog.ts");
const definitionsPath = join(root, "src", "templates", "definitions.tsx");
let catalog = await readFile(catalogPath, "utf8");
let definitions = await readFile(definitionsPath, "utf8");
catalog = replaceRequiredMarker(catalog, "// motioner-scaffold:manifest-imports", insertions.catalogImports);
catalog = replaceRequiredMarker(catalog, "  // motioner-scaffold:catalog-items", insertions.catalogItem);
definitions = replaceRequiredMarker(definitions, "// motioner-scaffold:component-imports", insertions.runtimeComponentImport);
definitions = replaceRequiredMarker(definitions, "// motioner-scaffold:manifest-imports", insertions.runtimeManifestImport);
definitions = replaceRequiredMarker(definitions, "  // motioner-scaffold:runtime-items", insertions.runtimeItem);
const manifestPath = join(root, "src", "templates", id, "manifest.ts");
const componentPath = join(root, "src", "remotion", "generated", `${id}.tsx`);
await Promise.all([mkdir(join(root, "src", "templates", id), {recursive: true}), mkdir(join(root, "src", "remotion", "generated"), {recursive: true})]);
await Promise.all([writeFile(manifestPath, generated.manifest, {encoding: "utf8", flag: "wx"}), writeFile(componentPath, generated.component, {encoding: "utf8", flag: "wx"})]);
await Promise.all([writeFile(catalogPath, catalog, "utf8"), writeFile(definitionsPath, definitions, "utf8")]);
process.stdout.write(`已创建模板 ${id}。下一步运行 pnpm check、pnpm visual:keyframes。\n`);
