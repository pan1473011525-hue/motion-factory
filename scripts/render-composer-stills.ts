import {mkdir, readFile} from "node:fs/promises";
import {join, resolve} from "node:path";
import {renderStill, selectComposition} from "@remotion/renderer";
import {createEmptyComposerComposition} from "../packages/project-model/src";
import {createComposerNode} from "../src/composer/registry";

const root = resolve(".");
const outputRoot = join(root, "output", "composer-previews");
const serveUrl = join(root, "dist", "remotion");
const browserExecutable = join(root, "vendor", "chrome-headless-shell", "chrome-headless-shell");
const durationInFrames = 150;
const scene = createEmptyComposerComposition();
scene.nodes = [
  createComposerNode("rectangle", "surface", durationInFrames, 0),
  createComposerNode("title", "title", durationInFrames, 1),
  createComposerNode("stat-number", "stat", durationInFrames, 2),
  createComposerNode("progress", "progress", durationInFrames, 3),
  createComposerNode("bar-chart", "chart", durationInFrames, 4),
  createComposerNode("image", "image", durationInFrames, 5),
];
const [surface, title, stat, progress, chart, image] = scene.nodes;
if (!surface || !title || !stat || !progress || !chart || !image) throw new Error("无法创建 Composer 视觉测试场景");
surface.name = "底板";
surface.transform = {...surface.transform, x: 0.04, y: 0.07, width: 0.92, height: 0.86, opacity: 0.92};
surface.props = {...surface.props, fill: "#111821", borderColor: "#314052", borderWidth: 2, radius: 34};
surface.motion.enter = "scale";
surface.motion.exit = "fade";
title.transform = {...title.transform, x: 0.09, y: 0.13, width: 0.52, height: 0.15};
title.props = {...title.props, text: "Motioner Composer", fontSize: 78, color: "#F4F7FB"};
title.motion.enter = "rise";
stat.transform = {...stat.transform, x: 0.09, y: 0.34, width: 0.32, height: 0.22};
stat.props = {...stat.props, value: 84.6, suffix: "%", label: "完成度", color: "#47A7FF"};
stat.motion.enter = "pop";
progress.transform = {...progress.transform, x: 0.09, y: 0.61, width: 0.42, height: 0.15};
progress.props = {...progress.props, value: 84.6, label: "渲染进度"};
progress.motion.enter = "wipe-left";
chart.transform = {...chart.transform, x: 0.56, y: 0.2, width: 0.32, height: 0.48};
chart.props = {...chart.props, title: "季度数据", labels: "Q1,Q2,Q3,Q4", values: "42,58,71,86"};
chart.motion.enter = "slide-right";
image.transform = {...image.transform, x: 0.68, y: 0.72, width: 0.2, height: 0.14};
image.props = {...image.props, assetId: "visual-fixture", fit: "cover", radius: 14};
image.motion.enter = "blur";

const fixturePath = join(root, "scripts", "fixtures", "media-sample.svg");
const fixtureAsset = {
  id: "visual-fixture",
  path: fixturePath,
  kind: "image" as const,
  src: `data:image/svg+xml;base64,${(await readFile(fixturePath)).toString("base64")}`,
};
const inputProps = {
  mode: "composer" as const,
  templateId: "stat-counter",
  templateProps: {title: "占位", value: 1, prefix: "", suffix: "", source: "", decimals: 0, accentColor: "#47A7FF", stylePreset: "editorial"},
  composition: scene,
  assets: [fixtureAsset],
};
const selected = await selectComposition({serveUrl, id: "MotionerComposition", inputProps, browserExecutable, chromiumOptions: {disableWebSecurity: true}, logLevel: "warn"});
await mkdir(outputRoot, {recursive: true});
for (const configuration of [
  {id: "16x9", width: 960, height: 540},
  {id: "9x16", width: 540, height: 960},
  {id: "1x1", width: 720, height: 720},
]) {
  const composition = {...selected, width: configuration.width, height: configuration.height, fps: 30, durationInFrames};
  for (const frame of [0, 18, 74, 140]) {
    await renderStill({serveUrl, composition, inputProps, frame, imageFormat: "png", output: join(outputRoot, `${configuration.id}-${String(frame).padStart(3, "0")}.png`), browserExecutable, chromiumOptions: {disableWebSecurity: true}, overwrite: true, logLevel: "warn"});
  }
}
process.stdout.write("✓ Composer visual regression (12 frames)\n");
