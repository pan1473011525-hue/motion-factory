import {mkdir, readFile} from "node:fs/promises";
import {join, resolve} from "node:path";
import {renderStill, selectComposition} from "@remotion/renderer";
import {templateCatalog} from "../src/templates/catalog";

const root = resolve(".");
const renderAspects = process.argv.includes("--aspects");
const outputRoot = join(root, "output", renderAspects ? "template-aspects" : "template-previews");
const serveUrl = join(root, "dist", "remotion");
const browserExecutable = join(root, "vendor", "chrome-headless-shell", "chrome-headless-shell");
const frameArgument = process.argv.find((argument) => argument.startsWith("--frames="));
const frames = renderAspects ? [74] : frameArgument
  ? frameArgument.slice("--frames=".length).split(",").map(Number)
  : process.argv.includes("--keyframes") ? [0, 9, 18, 74, 132, 149] : [60];
const templateArgument = process.argv.find((argument) => argument.startsWith("--template="));
const templates = templateArgument
  ? templateCatalog.filter((template) => template.id === templateArgument.slice("--template=".length))
  : templateCatalog;

await mkdir(outputRoot, {recursive: true});

const aspectConfigurations = renderAspects ? [
  {id: "16x9", width: 960, height: 540},
  {id: "9x16", width: 540, height: 960},
  {id: "1x1", width: 720, height: 720},
] : [{id: "", width: 960, height: 540}];

for (const template of templates) {
  const fixtureAsset = {
    id: "visual-fixture",
    path: join(root, "scripts", "fixtures", "media-sample.svg"),
    kind: "image" as const,
    src: `data:image/svg+xml;base64,${(await readFile(join(root, "scripts", "fixtures", "media-sample.svg"))).toString("base64")}`,
  };
  const mediaProps: Record<string, unknown> = template.id === "media-info" || template.id === "callout-annotation"
    ? {assetId: fixtureAsset.id}
    : template.id === "media-grid" || template.id === "split-screen"
      ? {asset1: fixtureAsset.id, asset2: fixtureAsset.id, asset3: fixtureAsset.id, asset4: fixtureAsset.id}
      : template.id === "media-carousel"
        ? {asset1: fixtureAsset.id, asset2: fixtureAsset.id, asset3: fixtureAsset.id, asset4: fixtureAsset.id, asset5: fixtureAsset.id}
        : template.id === "before-after"
          ? {beforeAsset: fixtureAsset.id, afterAsset: fixtureAsset.id}
      : template.id === "quote-card"
        ? {avatarAssetId: fixtureAsset.id}
        : template.id === "lower-third"
          ? {logoAssetId: fixtureAsset.id}
          : {};
  const hasMediaFixture = Object.keys(mediaProps).length > 0;
  const inputProps = {
    templateId: template.id,
    templateProps: {...template.defaultProps, ...mediaProps},
    assets: hasMediaFixture ? [fixtureAsset] : [],
  };
  const selected = await selectComposition({
    serveUrl,
    id: "MotionerComposition",
    inputProps,
    browserExecutable,
    chromiumOptions: {disableWebSecurity: true},
    logLevel: "warn",
  });
  const templateDirectory = join(outputRoot, template.id);
  await mkdir(templateDirectory, {recursive: true});
  for (const configuration of aspectConfigurations) {
    const composition = {...selected, width: configuration.width, height: configuration.height, fps: 30, durationInFrames: 150};
    for (const frame of frames) {
      await renderStill({
        serveUrl,
        composition,
        inputProps,
        frame,
        imageFormat: "png",
        output: join(templateDirectory, renderAspects ? `${configuration.id}.png` : `${String(frame).padStart(3, "0")}.png`),
        browserExecutable,
        chromiumOptions: {disableWebSecurity: true},
        overwrite: true,
        logLevel: "warn",
      });
    }
  }
  process.stdout.write(`✓ ${template.id} (${frames.length * aspectConfigurations.length} frames)\n`);
}
